# Week 15 : Testing and Final Report

*Date: 12 November 2026*

## Context

Final stretch: prove the rules work and write everything up for the
evaluation.

## Observation

- Each bug fixed earlier (cutoffs, check-in date, token validity, balance
  guard) deserved an automated test so it cannot return.
- Comparing the test cases to the code exposed small mismatches, such as the
  dashboard refresh interval and one error message.

## Resolution

- Wrote the Jest unit and API suites for cutoffs, security guards,
  registration, balance checks and e-mail verification, all passing.
- Helped the team draft the manual test cases in the Doc:T_01 template.
- Noted the open mismatches for the peer reviewers and started assembling
  the final report with the diagrams and requirements.
