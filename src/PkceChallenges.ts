import crypto from "crypto";

export interface PkceChallengesInterface {
  email: string;
  family_name: string;
  given_name: string;
  tp_acct_typ: string;
  code_challenge: string;
  client_id: string;
  code_challenge_method: string;
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

  public static validate(
    challengeUserInfo: PkceChallengesInterface,
    verifier: string
  ): Boolean {
    if (!challengeUserInfo) {
      return false;
    }
    const algo = challengeUserInfo.code_challenge_method;
    const challenge = challengeUserInfo.code_challenge;

    if (algo.toLowerCase() === "s256") {
      const hash = crypto
        .createHash("sha256")
        .update(verifier)
        .digest("base64");
      const expectedChallenge = hash
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, ""); // Base64Url encoding

      return expectedChallenge === challenge;
    } else {
      throw new Error(`Unsupported PKCE algorithm: ${algo}`);
    }
  }
}

export default PkceChallenges;
