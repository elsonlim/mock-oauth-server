import crypto from "crypto";

export interface PkceChallengesInterface {
  client_id: string;
  directory_id: string;
  code_challenge: string;
  code_challenge_method: string;
  email: string;
  family_name: string;
  given_name: string;
  tp_acct_typ: string;
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
    directory_id: string,
    client_id: string,
    challengeUserInfo: PkceChallengesInterface,
    verifier: string
  ): Boolean {
    if (
      !challengeUserInfo ||
      directory_id !== challengeUserInfo.directory_id ||
      client_id !== challengeUserInfo.client_id
    ) {
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
      return false;
    }
  }
}

export default PkceChallenges;
