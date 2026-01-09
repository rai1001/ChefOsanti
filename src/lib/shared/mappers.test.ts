import { describe, expect, it } from 'vitest'
import { createMapper, autoMapper, createMapperWithTransforms } from './mappers'

describe('mappers', () => {
    describe('createMapper', () => {
        it('mapea campos con nombres custom', () => {
            interface Hotel { id: string; name: string; orgId: string }

            const mapHotel = createMapper<Hotel>({
                id: 'id',
                name: 'full_name',
                orgId: 'organization_id'
            })

            const dbRow = {
                id: '123',
                full_name: 'Hotel California',
                organization_id: 'org_1'
            }

            const result = mapHotel(dbRow)

            expect(result).toEqual({
                id: '123',
                name: 'Hotel California',
                orgId: 'org_1'
            })
        })

        it('aplica transformaciones si se proveen', () => {
            interface User { isActive: boolean; roles: string[] }

            const mapUser = createMapper<User>({
                isActive: 'is_active',
                roles: 'roles_json'
            }, {
                isActive: (val) => val === 1,
                roles: (val) => JSON.parse(val)
            })

            const dbRow = {
                is_active: 1,
                roles_json: '["admin","staff"]'
            }

            const result = mapUser(dbRow)

            expect(result).toEqual({
                isActive: true,
                roles: ['admin', 'staff']
            })
        })
    })

    describe('autoMapper', () => {
        it('convierte keys de snake_case a camelCase', () => {
            const dbRow = {
                first_name: 'John',
                last_name: 'Doe',
                is_active_user: true
            }

            const result = autoMapper(dbRow)

            expect(result).toEqual({
                firstName: 'John',
                lastName: 'Doe',
                isActiveUser: true
            })
        })

        it('maneja objetos vacíos o nulos', () => {
            expect(autoMapper(null)).toEqual({})
            expect(autoMapper(undefined)).toEqual({})
            expect(autoMapper({})).toEqual({})
        })
    })

    describe('createMapperWithTransforms', () => {
        it('es un alias funcional de createMapper', () => {
            interface Price { amount: number }

            const mapPrice = createMapperWithTransforms<Price>({
                amount: 'cents'
            }, {
                amount: (val) => val / 100
            })

            expect(mapPrice({ cents: 5000 })).toEqual({ amount: 50 })
        })
    })
})
