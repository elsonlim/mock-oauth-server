export interface PkceChallengesInterface {
  email: string;
  family_name: string;
  given_name: string;
  tp_acct_typ: string;
  code_challenge: string;
  client_id: string;
}

class PkceChallenges {
  private readonly pkceChallenges = new Map<string, PkceChallengesInterface>();

  public set(code: string, value: PkceChallengesInterface): void {
    this.pkceChallenges.set(code, value);
  }

  public get(code: string): PkceChallengesInterface | void {
    return this.pkceChallenges.get(code);
  }

  public has(code: string): Boolean {
    return !!this.pkceChallenges.get(code);
  }
}

export default PkceChallenges;
