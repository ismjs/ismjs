import { describe, expect, it } from 'vitest'
import { IssueCode, Severity, issue } from '../src/issue.ts'

describe('Issue construction', () => {
  it('keeps named field, token, and rule metadata in their own slots', () => {
    expect(
      issue({
        code: IssueCode.Inconsistent,
        severity: Severity.Error,
        message: 'a rule failed',
        field: 'ownerProducer',
        token: 'GBR',
        ruleId: 'ISM-ID-00000',
      }),
    ).toEqual({
      code: IssueCode.Inconsistent,
      severity: Severity.Error,
      message: 'a rule failed',
      field: 'ownerProducer',
      token: 'GBR',
      ruleId: 'ISM-ID-00000',
    })
  })

  it('omits optional metadata that was not supplied', () => {
    expect(
      issue({
        code: IssueCode.Malformed,
        severity: Severity.Error,
        message: 'cannot read marking',
      }),
    ).toEqual({
      code: IssueCode.Malformed,
      severity: Severity.Error,
      message: 'cannot read marking',
    })
  })
})

const positionalIssueConstructionIsRejected = (): void => {
  // @ts-expect-error Issue metadata must be named so field and token cannot transpose.
  issue(IssueCode.Malformed, Severity.Error, 'cannot read marking', 'token', 'field')
}
void positionalIssueConstructionIsRejected
