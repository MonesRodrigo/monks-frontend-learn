---
title: 'AWS from GitHub Actions: kill the static keys'
description: How to replace long-lived AWS access keys in GitHub Actions with short-lived credentials obtained through OpenID Connect, with a trust policy you can actually defend.
summary: Use GitHub's OIDC provider to assume an IAM role instead of storing AWS access keys as repository secrets.
track: tooling
level: intermediate
format: article
author: MonesRodrigo
publishedAt: 2026-09-22
reviewBy: 2026-12-22
status: published
---

Plenty of pipelines still deploy to AWS with an `AWS_ACCESS_KEY_ID` and an
`AWS_SECRET_ACCESS_KEY` sitting in repository secrets. It works, and that is
exactly the problem: it keeps working long after it should. This guide replaces
that pattern with short-lived credentials issued through **OpenID Connect**.

## Why static keys are the weak link

An IAM user access key has no expiry. Whoever holds it *is* that IAM user until
somebody manually rotates the key. That means:

- It survives leaks. Printed in a log, pasted in a ticket, copied into a fork —
  it still works months later.
- It survives people. Contractors leave, the key stays.
- Rotation is manual, so in practice it does not happen.
- Every collaborator with write access to the repo can exfiltrate it through a
  workflow change.

Short-lived credentials remove the thing worth stealing. Nothing durable is
stored anywhere.

## How the OIDC handshake works

Every GitHub Actions job can request a signed **ID token** from GitHub's OIDC
provider. The token is a JWT describing the run: which repository, which branch
or environment, which workflow.

AWS can be told to trust that provider. The flow is:

1. The job asks GitHub for an ID token scoped to the audience `sts.amazonaws.com`.
2. The job calls `sts:AssumeRoleWithWebIdentity`, presenting the token.
3. STS validates the signature against GitHub's published keys, then checks the
   token's claims against the role's **trust policy**.
4. If the claims match, STS returns temporary credentials — by default valid for
   one hour.

The interesting part is step 3. The trust policy is where you decide *which*
repository, on *which* branch, is allowed to become this role.

:::note
The IAM role is the permission boundary; the trust policy is the authentication
boundary. Getting the second one wrong is how a role scoped to one repo ends up
assumable by every repo in the organisation.
:::

## Step 1 — Register the provider once per account

In **IAM → Identity providers**, add an OpenID Connect provider:

- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

This is an account-level resource. Create it once and reuse it for every role;
a second provider with the same URL will be rejected.

:::tip[This changed]
Older tutorials tell you to click **Get thumbprint** and paste a certificate
fingerprint. AWS stopped relying on thumbprints for providers backed by a
well-known certificate authority, which includes GitHub's. If the console still
shows the field, fetching it is harmless — but a broken thumbprint is no longer
the reason your role assumption fails, and pipelines no longer break when
GitHub rotates its certificate. See
[Obtain the thumbprint for an OIDC provider](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html).
:::

## Step 2 — Write a trust policy worth trusting

Create a role with **Web identity** as the trusted entity, then edit the trust
relationship directly. The console wizard produces something workable, but it is
worth understanding every line:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:my-org/my-site:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Two conditions, both mandatory:

- **`aud`** pins the audience. Without it, a token minted for a different
  service could be replayed against your role.
- **`sub`** pins the source. The format encodes the repository *and* the
  context that produced the token:

| `sub` value | Matches |
| :-- | :-- |
| `repo:my-org/my-site:ref:refs/heads/main` | Pushes to `main` |
| `repo:my-org/my-site:environment:production` | Jobs using the `production` environment |
| `repo:my-org/my-site:pull_request` | Pull request runs |

:::caution
Never write `"repo:my-org/*"` — or worse, drop the `sub` condition entirely and
keep only `aud`. That makes the role assumable from any repository in the
organisation, including one a compromised account creates this afternoon. If you
genuinely need a wildcard, use `StringLike` with the narrowest possible pattern
and treat it as a documented exception.
:::

Scoping by **environment** rather than branch is usually the stronger option:
environments support required reviewers and branch restrictions, so the ID token
is only ever minted after those gates pass.

For permissions, resist the tutorial reflex to attach `AdministratorAccess`. A
deploy role that syncs a static site needs `s3:PutObject`, `s3:DeleteObject`,
`s3:ListBucket` on one bucket and a CloudFront invalidation — nothing more.

## Step 3 — Wire up the workflow

Two changes to the job: request the token, then exchange it.

```yaml
permissions:
  contents: read
  id-token: write # required to request the OIDC token

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v7

      - uses: aws-actions/configure-aws-credentials@v6
        with:
          aws-region: us-east-1
          role-to-assume: arn:aws:iam::123456789012:role/my-site-deploy
          role-session-name: gha-my-site-deploy

      - run: aws s3 sync ./dist s3://my-site/ --delete
```

Every `AWS_*` secret disappears. The action performs the token exchange and
exports the temporary credentials for the steps that follow.

A few details worth knowing:

- `permissions` at workflow level applies to all jobs. Prefer declaring
  `id-token: write` on the single job that needs it.
- `role-session-name` is what shows up in CloudTrail. Make it identify the
  pipeline, not `GitHubActions`.
- The default session is one hour; raise it with `role-duration-seconds` only if
  a deploy genuinely runs longer, and only if the role's maximum session
  duration allows it.

## What else the old tutorials get wrong

Guides written around 2024 age badly in three specific places:

1. **`actions/checkout@v4` and `configure-aws-credentials@v4`.** Both are
   several majors behind. Pin to a current major and let Dependabot move it.
2. **`aws s3 sync --acl public-read`.** New buckets have S3 Block Public Access
   enabled and ACLs disabled (object ownership is *bucket owner enforced*), so
   that flag now fails outright. Serve the bucket through CloudFront with an
   Origin Access Control instead of making objects public.
3. **Trust policies scoped only by repository.** Add the branch or environment
   segment of the `sub` claim, or the role is broader than it looks.

## Debugging a rejected assumption

`Not authorized to perform sts:AssumeRoleWithWebIdentity` almost always means
one of these:

- `id-token: write` is missing from the job's `permissions`.
- The `sub` in the token does not match the trust policy — a tag build produces
  `ref:refs/tags/v1`, not `ref:refs/heads/main`.
- The workflow runs from a **forked** pull request. Those runs receive a
  read-only token and cannot request an ID token at all. This is deliberate:
  treat fork builds as untrusted and never give them deploy credentials.
- The identity provider lives in a different AWS account than the role.

The fastest way to see the real claims is to decode the token your job actually
receives, rather than guessing at the format.

## Further reading

- [Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) — the official GitHub walkthrough.
- [About security hardening with OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) — every claim available for trust policies.
- [Create an OIDC identity provider](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html) — the AWS side.
- [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials) — action inputs and OIDC options.
- [Using IAM the secure way in GitHub Actions](https://altf4.blog/blog/2024-03-03-using-iam-the-secure-way-in-github-actions/) — the 2024 post that prompted this write-up.
