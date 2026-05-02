---
inclusion: fileMatch
fileMatchPattern: "src/models/**/*.ts,src/common/exceptions/**/*.ts,src/common/constants/**/*.ts"
---

# Models, Exceptions & Constants

## Sequelize Model Rules

- Models live in `src/models/` (shared across modules)
- Use class-based models extending `Model<Attributes, CreationAttributes>`
- Define `IXxxAttributes` and `IXxxCreationAttributes` interfaces
- Use `declare` for all model properties
- All IDs are UUIDs (DataTypes.UUID + UUIDV4)
- Use `underscored: true` and explicit `field` mappings for snake_case DB columns
- Hash passwords in `beforeCreate` / `beforeUpdate` hooks — never in the service
- Use `defaultScope` to exclude sensitive fields (password, refreshToken)
- Use named scopes (`withPassword`, `withRefreshToken`) to include them when needed
- Associations are defined in `src/models/index.ts`
- Export both the Model class and its attribute interfaces from `src/models/index.ts`

Example pattern:

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IFeatureAttributes {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeatureCreationAttributes
  extends Optional<IFeatureAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Feature extends Model<IFeatureAttributes, IFeatureCreationAttributes>
  implements IFeatureAttributes {
  declare id: string;
  declare name: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Feature.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  { sequelize, tableName: 'features', timestamps: true, underscored: true },
);
```

## Migrations

- Migrations live in `src/database/migrations/` as plain JS files
- Naming: `YYYYMMDDHHMMSS-description.js`
- Always define both `up` and `down` methods
- Use UUIDs for all primary keys
- Add indexes for frequently queried columns
- Run: `npm run db:migrate` | Undo: `npm run db:migrate:undo`
- Generate: `npm run migration:generate <name>`

## Error Handling

Use typed exceptions from `src/common/exceptions/http.exception.ts`:
- `BadRequestException` (400)
- `UnauthorizedException` (401)
- `ForbiddenException` (403)
- `NotFoundException` (404)
- `ConflictException` (409)
- `TooManyRequestsException` (429)
- `InternalServerException` (500)

Rules:
- NEVER use `res.status().json()` in services — throw exceptions instead
- The global `errorHandler` middleware catches everything
- All exceptions extend `HttpException` which has `statusCode`, `message`, `isOperational`

## API Response Format

ALL endpoints MUST return this JSON structure via `ApiResponse`:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Descriptive message",
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false }
}
```

Use: `ApiResponse.success()`, `ApiResponse.created()`, `ApiResponse.paginated()`, `ApiResponse.error()`, `ApiResponse.noContent()`

## Constants

- All user-facing message strings go in `src/common/constants/messages.ts`
- Group messages by domain: `AUTH_MESSAGES`, `USER_MESSAGES`, `CHAT_MESSAGES`, `COMMON_MESSAGES`
- Use `as const` for type safety
- When adding a new module, add its messages constant object to this file
