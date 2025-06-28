export class PaginatedDataDto<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  nextPage: number | null;
}
