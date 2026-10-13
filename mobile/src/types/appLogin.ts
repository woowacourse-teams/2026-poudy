export type AppLoginProvider = 'kakao' | 'google';

export interface ProviderTokenIssued {
  readonly status: 'success';
  readonly token: string;
}

export interface ProviderTokenMissing {
  readonly status: 'cancelled' | 'failed' | 'unavailable';
}

export type ProviderTokenOutcome = ProviderTokenIssued | ProviderTokenMissing;

export interface AppLoginTarget {
  readonly provider: AppLoginProvider;
}

export interface AppLoginSuccess extends ProviderTokenIssued, AppLoginTarget {}

export interface AppLoginFailure extends ProviderTokenMissing, AppLoginTarget {}

export type AppLoginResult = AppLoginSuccess | AppLoginFailure;
