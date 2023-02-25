export type ResponseCommon = {
  status?: number;
  success?: boolean;
  results?: any | any[] | null;
};

export type ResponseError = ResponseCommon & {
  errors?: Error | ResponseError;
  message?: string;
};
