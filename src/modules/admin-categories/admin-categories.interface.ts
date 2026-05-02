export interface CreateCategoryDto {
  name: string;
  icon?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  icon?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}
