export type ProductionPlanStatus = 'draft' | 'in_progress' | 'done';
export type ProductionPlanSource = 'manual' | 'menu';
export type ProductionStation = 'frio' | 'caliente' | 'pasteleria' | 'barra' | 'office' | 'almacen' | 'externo';
export type ProductionTaskStatus = 'todo' | 'doing' | 'done' | 'blocked';

export interface ProductionPlan {
    id: string;
    org_id: string;
    hotel_id: string;
    event_id: string;
    event_service_id: string;
    status: ProductionPlanStatus;
    generated_from: ProductionPlanSource;
    created_at: string;
    created_by?: string;
}

export interface ProductionTask {
    id: string;
    org_id: string;
    plan_id: string;
    station: ProductionStation;
    title: string;
    due_at?: string;
    assignee_staff_id?: string;
    priority: number;
    status: ProductionTaskStatus;
    blocked_reason?: string;
    notes?: string;
    created_at: string;
    // PR2: Auto-Generation
    planned_qty?: number;
    unit?: string;
    recipe_id?: string;
}

export interface MenuItemRecipeAlias {
    id: string;
    org_id: string;
    alias_name: string;
    recipe_id: string;
}

export interface RecipeProductionMeta {
    id: string;
    org_id: string;
    recipe_id: string;
    station: ProductionStation;
    lead_time_minutes: number;
    default_batch_size?: number;
    shelf_life_days?: number;
}

export interface ProductionTaskWithContext extends ProductionTask {
    event_name: string;
    event_date: string;
    plan_status: ProductionPlanStatus;
}
