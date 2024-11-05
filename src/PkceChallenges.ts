import crypto from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

export interface UserDetailsInterface {
  client_id: string;
  directory_id: string;
  code_challenge: string;
  code_challenge_method: string;
  email: string;
  family_name: string;
  given_name: string;
  tp_acct_typ: string;
}

class UserDetails {
  private readonly tableName: string;
  private readonly docClient: DynamoDBDocumentClient;

  constructor(tableName = "", region?: string, endpoint?: string) {
    this.tableName = tableName;
    const client = new DynamoDBClient({
      region: region,
      endpoint: endpoint,
    });
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  public async set(code: string, value: UserDetailsInterface): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          code: code,
          ...value,
        },
      })
    );
  }

  public async get(code: string): Promise<UserDetailsInterface | undefined> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          code: code,
        },
      })
    );
    return result.Item as UserDetailsInterface | undefined;
  }

  public async has(code: string): Promise<boolean> {
    const result = await this.get(code);
    return !!result;
  }

  public static pkceValidate(
    directory_id: string,
    client_id: string,
    challengeUserInfo: UserDetailsInterface,
    verifier: string
  ): boolean {
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

export default UserDetails;
