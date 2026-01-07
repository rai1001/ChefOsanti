export type UUID = string

export type OrgId = UUID
export type UserId = UUID

export type Org = {
  id: OrgId
  name: string
  slug: string
}

export type OrgMembershipRole = 'owner' | 'admin' | 'member'

export type OrgMembership = {
  orgId: OrgId
  userId: UserId
  role: OrgMembershipRole
}

export type Hotel = {
  id: UUID
  orgId: OrgId
  name: string
  city?: string
  country?: string
  currency: string
}
