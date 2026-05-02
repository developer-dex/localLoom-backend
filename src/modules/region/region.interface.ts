export interface CreateRegionDto {
  name: string;
}

export interface UpdateRegionDto {
  name?: string;
  isActive?: boolean;
}
