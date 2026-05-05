export type ProviderType = 'aws' | 'gcp' | 'azure';

export interface ProviderCredential {
  id: number;
  user_id: number;
  label: string;
  provider: ProviderType;
  region: string;
  encrypted_credentials: string;
  verified: number;
  credential_type: 'permanent' | 'temporary';
  created_at: string;
}

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface GcpCredentials {
  type: string;
  project_id: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
}

export interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

export type CloudCredentials = AwsCredentials | GcpCredentials | AzureCredentials;
