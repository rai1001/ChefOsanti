/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Utility type to convert snake_case string to camelCase
 */
type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
    ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
    : S

/**
 * Utility type to convert a type's keys from snake_case to camelCase
 */
export type DbToDomain<T> = {
    [K in keyof T as SnakeToCamelCase<K & string>]: T[K]
}

/**
 * Creates a standard mapper function to transform DB rows to Domain objects.
 * 
 * @param fieldMap Mapping from Domain key to DB column name.
 * @param transforms Optional transformations for specific fields.
 */
export function createMapper<TDomain, TDb = any>(
    fieldMap: Record<keyof TDomain, string>,
    transforms?: Partial<Record<keyof TDomain, (value: any) => any>>
): (row: TDb) => TDomain {
    return (row: TDb): TDomain => {
        const result = {} as TDomain

        for (const [domainKey, dbKey] of Object.entries(fieldMap) as Array<[keyof TDomain, string]>) {
            if (!row) continue

            let value = (row as any)[dbKey]

            // Apply transform if exists
            if (transforms && transforms[domainKey]) {
                value = transforms[domainKey]!(value)
            }

            result[domainKey] = value
        }

        return result
    }
}

/**
 * Creates a mapper with explicit transforms (alias for clarity).
 */
export function createMapperWithTransforms<TDomain, TDb = any>(
    fieldMap: Record<keyof TDomain, string>,
    transforms: Partial<Record<keyof TDomain, (value: any) => any>>
): (row: TDb) => TDomain {
    return createMapper(fieldMap, transforms)
}

/**
 * Simple Auto-Mapper that converts snake_case keys to camelCase keys.
 * Use this for simple flat objects where no special value transformation is needed.
 */
export function autoMapper<TDomain>(row: any): TDomain {
    if (!row) return {} as TDomain

    const result: any = {}

    for (const key of Object.keys(row)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        result[camelKey] = row[key]
    }

    return result as TDomain
}
