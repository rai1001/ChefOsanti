# 📋 Plan de Acción - Mejoras Código ChefOsanti

**Fecha:** 2026-01-09
**Basado en:** CODE_REVIEW.md
**Branch:** `claude/code-review-feedback-vQ2Bo`

---

## 📊 RESUMEN EJECUTIVO

**Total de mejoras identificadas:** 10
- 🔴 **Críticas:** 1 (resolver HOY)
- 🟠 **Altas:** 3 (resolver este mes)
- 🟡 **Medias:** 4 (roadmap próximos sprints)
- 🟢 **Bajas:** 2 (backlog)

**Esfuerzo total estimado:** 20-24 días de desarrollo
**Impacto en puntuación:** +0.5 a +0.8 puntos (de 8.7 a 9.2-9.5)

---

## 🎯 OBJETIVOS POR FASE

### **Fase 0: Crítico (HOY)**
- Resolver vulnerabilidad de seguridad API key
- **Tiempo:** 30 minutos
- **Bloqueante para producción:** SÍ

### **Fase 1: Fundacional (Semana 1-2)**
- Mejorar experiencia de usuario con errores
- Proteger Edge Functions de abuso
- **Tiempo:** 4-5 días
- **Impacto:** Alto en UX y costos

### **Fase 2: Calidad (Semana 3-4)**
- Reducir deuda técnica
- Aumentar cobertura de tests
- **Tiempo:** 6-7 días
- **Impacto:** Medio en mantenibilidad

### **Fase 3: Optimización (Backlog)**
- Mejoras de organización
- Optimizaciones incrementales
- **Tiempo:** 8-10 días
- **Impacto:** Bajo, mejoras incrementales

---

## 🔴 FASE 0: CRÍTICO (HOY - 30 minutos)

### Issue #1: API Key Hardcodeada

**Prioridad:** 🔴 CRÍTICA
**Riesgo:** Alto - Seguridad comprometida
**Esfuerzo:** 30 minutos
**Asignado a:** DevOps + Backend Lead

#### **Tareas:**

1. **[Inmediato] Revocar API key expuesta**
   - Ir a Google Cloud Console → APIs & Services → Credentials
   - Localizar key: `AIzaSyCfjgND4PgkwhFvo5PvewjaJbEHPG8yf8o`
   - Revocar/Eliminar
   - **Tiempo:** 5 minutos

2. **[Inmediato] Generar nueva API key**
   - Crear nueva API key en Google Cloud
   - Restringir por IP (opcional) o por dominio
   - Limitar a Gemini API únicamente
   - **Tiempo:** 5 minutos

3. **[Inmediato] Configurar en entornos**
   ```bash
   # Desarrollo local (.env.local)
   GEMINI_API_KEY=nueva_key_aqui

   # Supabase local
   npx supabase secrets set GEMINI_API_KEY=nueva_key_aqui

   # Producción (Supabase Dashboard)
   # Project → Settings → Edge Functions → Secrets
   # Añadir GEMINI_API_KEY=nueva_key_aqui
   ```
   - **Tiempo:** 10 minutos

4. **[Código] Eliminar fallback hardcoded**

   **Archivo:** `supabase/functions/ocr_process/index.ts`

   **Cambiar línea 10:**
   ```typescript
   // ❌ ANTES:
   const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? 'AIzaSyCfjgND4PgkwhFvo5PvewjaJbEHPG8yf8o'

   // ✅ DESPUÉS:
   const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
   if (!geminiApiKey) {
     console.error('GEMINI_API_KEY no configurado')
     return new Response(
       JSON.stringify({ error: 'Configuración del servidor incompleta' }),
       { status: 500 }
     )
   }
   ```
   - **Tiempo:** 5 minutos

5. **[Verificación] Testing**
   ```bash
   # Local
   curl -X POST http://localhost:54321/functions/v1/ocr_process/enqueue \
     -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"attachmentId":"test-id"}'

   # Verificar que funciona sin errores
   ```
   - **Tiempo:** 5 minutos

#### **Checklist de Verificación:**
- [ ] API key antigua revocada en Google Cloud
- [ ] Nueva API key generada y restringida
- [ ] Variable de entorno configurada en local
- [ ] Variable de entorno configurada en Supabase (secrets)
- [ ] Código actualizado sin fallback hardcoded
- [ ] Tests locales pasando
- [ ] Commit y push realizado
- [ ] Documentado en `.env.example`

#### **Commit sugerido:**
```bash
git add supabase/functions/ocr_process/index.ts
git commit -m "fix(security): remove hardcoded API key from ocr_process function

- Remove fallback Gemini API key from code
- Require GEMINI_API_KEY environment variable
- Add validation and error handling
- Update .env.example with required vars

CRITICAL: Old API key has been revoked"
```

#### **Dependencias:**
- Ninguna (acción independiente)

#### **Métricas de Éxito:**
- ✅ API key no presente en código
- ✅ Function funciona correctamente con variable de entorno
- ✅ Tests E2E de OCR pasando

---

## 🟠 FASE 1: FUNDACIONAL (Semana 1-2, 4-5 días)

### Issue #2: Mensajes de Error User-Friendly

**Prioridad:** 🟠 ALTA
**Impacto:** Alto - Experiencia de usuario
**Esfuerzo:** 2-3 días
**Asignado a:** Frontend Lead

#### **Tareas:**

**Día 1: Infraestructura (4 horas)**

1. **Crear helper de mensajes**

   **Archivo nuevo:** `src/lib/shared/userMessages.ts`
   ```typescript
   import type { AppError, AppErrorType } from './errors'

   interface UserMessage {
     title: string
     description: string
     action?: string
   }

   const errorMessages: Record<AppErrorType, UserMessage> = {
     NotFoundError: {
       title: 'No encontrado',
       description: 'El recurso solicitado no existe o no tienes acceso',
       action: 'Verifica la URL o contacta soporte'
     },
     ValidationError: {
       title: 'Datos inválidos',
       description: 'Los datos ingresados no cumplen los requisitos',
       action: 'Revisa los campos marcados en rojo'
     },
     NetworkError: {
       title: 'Error de conexión',
       description: 'No se pudo conectar con el servidor',
       action: 'Verifica tu conexión a internet e intenta de nuevo'
     },
     AuthError: {
       title: 'Sesión expirada',
       description: 'Tu sesión ha caducado por seguridad',
       action: 'Por favor, inicia sesión nuevamente'
     },
     ConflictError: {
       title: 'Registro duplicado',
       description: 'Este recurso ya existe en el sistema',
       action: 'Usa un identificador diferente'
     },
     UnknownError: {
       title: 'Error inesperado',
       description: 'Algo salió mal. El equipo técnico ha sido notificado',
       action: 'Si persiste, contacta soporte con el código de error'
     }
   }

   export function getUserMessage(error: any): UserMessage {
     if (!error) {
       return errorMessages.UnknownError
     }

     // Si es AppError, usar el tipo
     if (error.type && errorMessages[error.type as AppErrorType]) {
       return errorMessages[error.type as AppErrorType]
     }

     // Fallback
     return errorMessages.UnknownError
   }

   export function getErrorTitle(error: any): string {
     return getUserMessage(error).title
   }

   export function getErrorDescription(error: any): string {
     return getUserMessage(error).description
   }

   export function getErrorAction(error: any): string | undefined {
     return getUserMessage(error).action
   }
   ```

2. **Crear componente ErrorMessage**

   **Archivo nuevo:** `src/modules/shared/ui/ErrorMessage.tsx`
   ```typescript
   import { AlertCircle } from 'lucide-react'
   import { getUserMessage } from '@/lib/shared/userMessages'

   interface ErrorMessageProps {
     error: any
     className?: string
   }

   export function ErrorMessage({ error, className = '' }: ErrorMessageProps) {
     if (!error) return null

     const message = getUserMessage(error)

     return (
       <div className={`rounded-lg border border-red-500/20 bg-red-500/10 p-4 ${className}`}>
         <div className="flex gap-3">
           <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
           <div className="flex-1">
             <h3 className="text-sm font-semibold text-red-500">{message.title}</h3>
             <p className="mt-1 text-sm text-red-400">{message.description}</p>
             {message.action && (
               <p className="mt-2 text-xs text-red-300 opacity-80">
                 💡 {message.action}
               </p>
             )}
           </div>
         </div>
       </div>
     )
   }
   ```

**Día 2: Migración de componentes (6 horas)**

3. **Actualizar componentes principales**

   Archivos a modificar (~15 archivos):
   - `src/modules/purchasing/ui/PurchaseOrderDetailPage.tsx`
   - `src/modules/purchasing/ui/PurchaseOrdersPage.tsx`
   - `src/modules/purchasing/ui/NewPurchaseOrderPage.tsx`
   - `src/modules/purchasing/ui/SuppliersPage.tsx`
   - `src/modules/purchasing/ui/SupplierDetailPage.tsx`
   - `src/modules/events/ui/EventDetailPage.tsx`
   - `src/modules/events/ui/EventsBoardPage.tsx`
   - Y otros componentes que muestren errores

   **Patrón de reemplazo:**
   ```typescript
   // ❌ ANTES:
   {purchaseOrder.isError && (
     <div className="p-4 text-sm text-red-500">
       <span className="font-semibold block">Error al cargar pedido</span>
       <span className="text-xs opacity-90">{poError}</span>
     </div>
   )}

   // ✅ DESPUÉS:
   import { ErrorMessage } from '@/modules/shared/ui/ErrorMessage'

   {purchaseOrder.isError && (
     <ErrorMessage error={purchaseOrder.error} />
   )}
   ```

**Día 3: Testing y refinamiento (4 horas)**

4. **Tests del helper**

   **Archivo nuevo:** `src/lib/shared/userMessages.test.ts`
   ```typescript
   import { describe, expect, it } from 'vitest'
   import { AppError } from './errors'
   import { getUserMessage, getErrorTitle } from './userMessages'

   describe('userMessages', () => {
     it('devuelve mensaje para NotFoundError', () => {
       const error = new AppError('NotFoundError', 'Record not found')
       const message = getUserMessage(error)
       expect(message.title).toBe('No encontrado')
       expect(message.description).toContain('no existe')
     })

     it('devuelve mensaje para ValidationError', () => {
       const error = new AppError('ValidationError', 'Invalid data')
       const message = getUserMessage(error)
       expect(message.title).toBe('Datos inválidos')
     })

     it('devuelve fallback para error desconocido', () => {
       const error = new Error('Random error')
       const message = getUserMessage(error)
       expect(message.title).toBe('Error inesperado')
     })
   })
   ```

5. **Test de componente ErrorMessage**

   **Archivo nuevo:** `src/modules/shared/ui/ErrorMessage.test.tsx`
   ```typescript
   import { render, screen } from '@testing-library/react'
   import { describe, expect, it } from 'vitest'
   import { AppError } from '@/lib/shared/errors'
   import { ErrorMessage } from './ErrorMessage'

   describe('ErrorMessage', () => {
     it('muestra título y descripción del error', () => {
       const error = new AppError('ValidationError', 'Invalid input')
       render(<ErrorMessage error={error} />)

       expect(screen.getByText('Datos inválidos')).toBeInTheDocument()
       expect(screen.getByText(/no cumplen los requisitos/)).toBeInTheDocument()
     })

     it('no renderiza nada si no hay error', () => {
       const { container } = render(<ErrorMessage error={null} />)
       expect(container.firstChild).toBeNull()
     })
   })
   ```

6. **Verificación manual**
   - Probar cada tipo de error en UI
   - Verificar responsive en móvil
   - Screenshot para documentación

#### **Checklist de Verificación:**
- [ ] Helper `userMessages.ts` creado
- [ ] Componente `ErrorMessage` creado
- [ ] 15+ componentes migrados
- [ ] Tests unitarios pasando
- [ ] Tests E2E no afectados
- [ ] Documentación actualizada
- [ ] PR abierto para review

#### **Commits sugeridos:**
```bash
# Commit 1
git add src/lib/shared/userMessages.ts src/lib/shared/userMessages.test.ts
git commit -m "feat(errors): add user-friendly error messages helper

- Create getUserMessage utility for translating AppError to user messages
- Add Spanish messages for all error types
- Include action hints for users
- Add unit tests"

# Commit 2
git add src/modules/shared/ui/ErrorMessage.tsx src/modules/shared/ui/ErrorMessage.test.tsx
git commit -m "feat(ui): add ErrorMessage component for consistent error display

- Create reusable ErrorMessage component
- Use lucide-react icons
- Responsive design with Tailwind
- Add tests"

# Commit 3
git add src/modules/purchasing/ui/*.tsx src/modules/events/ui/*.tsx
git commit -m "refactor(ui): migrate error displays to ErrorMessage component

- Replace raw error text with ErrorMessage component
- Improve UX with contextual error messages
- Apply to purchasing and events modules"
```

#### **Dependencias:**
- Ninguna

#### **Métricas de Éxito:**
- ✅ 0 errores técnicos mostrados al usuario
- ✅ Todos los errores con mensaje user-friendly
- ✅ Tests de componente ErrorMessage pasando
- ✅ Feedback positivo en UAT

---

### Issue #3: Rate Limiting en Edge Functions

**Prioridad:** 🟠 ALTA
**Impacto:** Alto - Costos y seguridad
**Esfuerzo:** 1 día
**Asignado a:** Backend Lead

#### **Tareas:**

**Día 1: Implementación (6 horas)**

1. **Crear helper de rate limiting**

   **Archivo nuevo:** `supabase/functions/_shared/rateLimit.ts`
   ```typescript
   interface RateLimitRecord {
     count: number
     resetAt: number
   }

   const store = new Map<string, RateLimitRecord>()

   // Limpieza periódica cada 5 minutos
   setInterval(() => {
     const now = Date.now()
     for (const [key, record] of store.entries()) {
       if (now > record.resetAt) {
         store.delete(key)
       }
     }
   }, 5 * 60 * 1000)

   export interface RateLimitConfig {
     limit: number        // Número de requests permitidos
     windowMs: number     // Ventana de tiempo en ms
     keyPrefix?: string   // Prefijo para la key (ej: 'ocr', 'audit')
   }

   export class RateLimitError extends Error {
     constructor(
       public readonly retryAfter: number,
       message = 'Rate limit exceeded'
     ) {
       super(message)
       this.name = 'RateLimitError'
     }
   }

   /**
    * Verifica rate limit para una key (ej: orgId)
    * @throws RateLimitError si se excede el límite
    */
   export async function checkRateLimit(
     key: string,
     config: RateLimitConfig
   ): Promise<void> {
     const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key
     const now = Date.now()
     const record = store.get(fullKey)

     // Primera request o ventana expirada
     if (!record || now > record.resetAt) {
       store.set(fullKey, {
         count: 1,
         resetAt: now + config.windowMs
       })
       return
     }

     // Incrementar contador
     if (record.count >= config.limit) {
       const retryAfter = Math.ceil((record.resetAt - now) / 1000)
       throw new RateLimitError(
         retryAfter,
         `Rate limit exceeded. Try again in ${retryAfter} seconds`
       )
     }

     record.count++
   }

   /**
    * Obtiene información de rate limit sin incrementar
    */
   export function getRateLimitInfo(
     key: string,
     config: RateLimitConfig
   ): { remaining: number; resetAt: number } {
     const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key
     const record = store.get(fullKey)
     const now = Date.now()

     if (!record || now > record.resetAt) {
       return { remaining: config.limit, resetAt: now + config.windowMs }
     }

     return {
       remaining: Math.max(0, config.limit - record.count),
       resetAt: record.resetAt
     }
   }
   ```

2. **Aplicar a ocr_process**

   **Archivo:** `supabase/functions/ocr_process/index.ts`
   ```typescript
   import { checkRateLimit, RateLimitError } from '../_shared/rateLimit.ts'

   // Configuración
   const OCR_RATE_LIMIT = {
     limit: 10,          // 10 requests
     windowMs: 60000,    // por minuto
     keyPrefix: 'ocr'
   }

   async function handleRun(req: Request) {
     const client = supabaseForUser(req)
     const body = (await req.json().catch(() => ({}))) as { jobId?: string }
     if (!body.jobId) return new Response(JSON.stringify({ error: 'jobId requerido' }), { status: 400 })

     const { data: job, error: jobErr } = await client
       .from('ocr_jobs')
       .select('id, status, org_id, attachment_id')
       .eq('id', body.jobId)
       .single()
     if (jobErr || !job) return new Response(JSON.stringify({ error: jobErr?.message || 'Job no encontrado' }), { status: 404 })

     // ✅ NUEVO: Rate limiting
     try {
       await checkRateLimit(job.org_id, OCR_RATE_LIMIT)
     } catch (err) {
       if (err instanceof RateLimitError) {
         return new Response(
           JSON.stringify({
             error: 'Demasiadas solicitudes. Intenta más tarde',
             retryAfter: err.retryAfter
           }),
           {
             status: 429,
             headers: {
               'Retry-After': String(err.retryAfter),
               'X-RateLimit-Limit': String(OCR_RATE_LIMIT.limit),
               'X-RateLimit-Window': String(OCR_RATE_LIMIT.windowMs / 1000)
             }
           }
         )
       }
       throw err
     }

     // ... resto del código
   }
   ```

3. **Aplicar a order_audit**

   **Archivo:** `supabase/functions/order_audit/index.ts`
   ```typescript
   import { checkRateLimit, RateLimitError } from '../_shared/rateLimit.ts'

   const AUDIT_RATE_LIMIT = {
     limit: 20,          // 20 requests
     windowMs: 60000,    // por minuto
     keyPrefix: 'audit'
   }

   // Similar a ocr_process
   ```

4. **Aplicar a daily_brief**

   **Archivo:** `supabase/functions/daily_brief/index.ts`
   ```typescript
   import { checkRateLimit, RateLimitError } from '../_shared/rateLimit.ts'

   const BRIEF_RATE_LIMIT = {
     limit: 5,           // 5 requests
     windowMs: 3600000,  // por hora
     keyPrefix: 'brief'
   }

   // Similar a ocr_process
   ```

**Día 1: Testing (2 horas)**

5. **Tests de rate limiting**

   **Archivo nuevo:** `supabase/functions/_shared/rateLimit.test.ts`
   ```typescript
   import { assertEquals, assertThrows } from 'https://deno.land/std@0.177.0/testing/asserts.ts'
   import { checkRateLimit, RateLimitError } from './rateLimit.ts'

   Deno.test('permite requests dentro del límite', async () => {
     const config = { limit: 3, windowMs: 1000 }

     await checkRateLimit('test-1', config)
     await checkRateLimit('test-1', config)
     await checkRateLimit('test-1', config)
     // No debe lanzar error
   })

   Deno.test('bloquea al exceder límite', async () => {
     const config = { limit: 2, windowMs: 1000 }

     await checkRateLimit('test-2', config)
     await checkRateLimit('test-2', config)

     assertThrows(
       () => checkRateLimit('test-2', config),
       RateLimitError,
       'Rate limit exceeded'
     )
   })

   Deno.test('resetea después de ventana', async () => {
     const config = { limit: 1, windowMs: 100 }

     await checkRateLimit('test-3', config)

     // Esperar que expire
     await new Promise(resolve => setTimeout(resolve, 150))

     // Debería permitir de nuevo
     await checkRateLimit('test-3', config)
   })
   ```

6. **Test E2E de rate limiting**

   Script manual para verificar:
   ```bash
   # Hacer 15 requests rápidas (límite es 10)
   for i in {1..15}; do
     curl -X POST http://localhost:54321/functions/v1/ocr_process/run \
       -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
       -H "Content-Type: application/json" \
       -d '{"jobId":"test-job-id"}' &
   done
   wait

   # Las últimas 5 deberían devolver 429 Too Many Requests
   ```

#### **Checklist de Verificación:**
- [ ] Helper `rateLimit.ts` creado
- [ ] Rate limiting aplicado a ocr_process
- [ ] Rate limiting aplicado a order_audit
- [ ] Rate limiting aplicado a daily_brief
- [ ] Tests unitarios pasando
- [ ] Test manual de rate limiting exitoso
- [ ] Headers HTTP correctos (Retry-After, X-RateLimit-*)
- [ ] Documentado en README

#### **Commits sugeridos:**
```bash
git add supabase/functions/_shared/rateLimit.ts supabase/functions/_shared/rateLimit.test.ts
git commit -m "feat(edge-functions): add rate limiting utility

- Create shared rate limit helper for Edge Functions
- Support configurable limits and windows
- Add RateLimitError with retryAfter
- Include cleanup mechanism
- Add unit tests"

git add supabase/functions/*/index.ts
git commit -m "feat(edge-functions): apply rate limiting to all functions

- OCR: 10 requests/minute per org
- Audit: 20 requests/minute per org
- Brief: 5 requests/hour per org
- Return 429 with Retry-After header
- Add X-RateLimit-* headers"
```

#### **Dependencias:**
- Ninguna

#### **Métricas de Éxito:**
- ✅ Rate limiting funcionando en las 3 Edge Functions
- ✅ Respuestas 429 con headers correctos
- ✅ No hay degradación de performance
- ✅ Costos de Gemini bajo control

---

## 🟡 FASE 2: CALIDAD (Semana 3-4, 6-7 días)

### Issue #4: Eliminar Código Duplicado en Mappers

**Prioridad:** 🟡 MEDIA
**Impacto:** Medio - Mantenibilidad
**Esfuerzo:** 2 días
**Asignado a:** Full-stack Developer

#### **Tareas:**

**Día 1: Infraestructura (4 horas)**

1. **Crear generador de mappers**

   **Archivo nuevo:** `src/lib/shared/mappers.ts`
   ```typescript
   /**
    * Generador de mappers DB → Domain
    * Convierte snake_case a camelCase automáticamente
    */

   type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
     ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
     : S

   type DbToDomain<T> = {
     [K in keyof T as SnakeToCamelCase<K & string>]: T[K]
   }

   /**
    * Crea un mapper genérico con mapeo de campos
    */
   export function createMapper<TDomain, TDb = any>(
     fieldMap: Record<keyof TDomain, string>
   ): (row: TDb) => TDomain {
     return (row: TDb): TDomain => {
       const result = {} as TDomain

       for (const [domainKey, dbKey] of Object.entries(fieldMap) as Array<[keyof TDomain, string]>) {
         const value = (row as any)[dbKey]
         result[domainKey] = value
       }

       return result
     }
   }

   /**
    * Mapper automático simple: snake_case → camelCase
    * Para tipos planos sin transformaciones complejas
    */
   export function autoMapper<TDomain>(row: any): TDomain {
     const result = {} as TDomain

     for (const key in row) {
       const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
       ;(result as any)[camelKey] = row[key]
     }

     return result
   }

   /**
    * Mapper con transformaciones custom
    */
   export function createMapperWithTransforms<TDomain, TDb = any>(
     fieldMap: Record<keyof TDomain, string>,
     transforms?: Partial<Record<keyof TDomain, (value: any) => any>>
   ): (row: TDb) => TDomain {
     return (row: TDb): TDomain => {
       const result = {} as TDomain

       for (const [domainKey, dbKey] of Object.entries(fieldMap) as Array<[keyof TDomain, string]>) {
         let value = (row as any)[dbKey]

         // Aplicar transformación si existe
         if (transforms && transforms[domainKey]) {
           value = transforms[domainKey]!(value)
         }

         result[domainKey] = value
       }

       return result
     }
   }
   ```

2. **Tests del generador**

   **Archivo nuevo:** `src/lib/shared/mappers.test.ts`
   ```typescript
   import { describe, expect, it } from 'vitest'
   import { createMapper, autoMapper, createMapperWithTransforms } from './mappers'

   describe('mappers', () => {
     describe('createMapper', () => {
       it('mapea campos con nombres custom', () => {
         interface Hotel { id: string; name: string; orgId: string }

         const mapHotel = createMapper<Hotel>({
           id: 'id',
           name: 'name',
           orgId: 'org_id'
         })

         const row = { id: '123', name: 'Hotel Test', org_id: 'org-456' }
         const result = mapHotel(row)

         expect(result).toEqual({
           id: '123',
           name: 'Hotel Test',
           orgId: 'org-456'
         })
       })
     })

     describe('autoMapper', () => {
       it('convierte snake_case a camelCase', () => {
         interface User { userId: string; firstName: string; createdAt: string }

         const row = { user_id: '123', first_name: 'John', created_at: '2026-01-09' }
         const result = autoMapper<User>(row)

         expect(result).toEqual({
           userId: '123',
           firstName: 'John',
           createdAt: '2026-01-09'
         })
       })
     })

     describe('createMapperWithTransforms', () => {
       it('aplica transformaciones a campos', () => {
         interface Product { id: string; price: number; createdAt: Date }

         const mapProduct = createMapperWithTransforms<Product>(
           { id: 'id', price: 'price', createdAt: 'created_at' },
           { createdAt: (value) => new Date(value) }
         )

         const row = { id: '123', price: 10.5, created_at: '2026-01-09' }
         const result = mapProduct(row)

         expect(result.id).toBe('123')
         expect(result.price).toBe(10.5)
         expect(result.createdAt).toBeInstanceOf(Date)
       })
     })
   })
   ```

**Día 2: Migración (6 horas)**

3. **Migrar mappers de purchasing**

   **Archivo:** `src/modules/purchasing/data/orders.ts`
   ```typescript
   import { createMapper } from '@/lib/shared/mappers'

   // ✅ DESPUÉS - Versión concisa:
   const mapHotel = createMapper<Hotel>({
     id: 'id',
     name: 'name',
     orgId: 'org_id'
   })

   const mapIngredient = createMapper<Ingredient>({
     id: 'id',
     name: 'name',
     hotelId: 'hotel_id',
     orgId: 'org_id',
     baseUnit: 'base_unit',
     stock: 'stock'
   })

   const mapPurchaseOrder = createMapper<PurchaseOrder>({
     id: 'id',
     orgId: 'org_id',
     hotelId: 'hotel_id',
     supplierId: 'supplier_id',
     status: 'status',
     orderNumber: 'order_number',
     notes: 'notes',
     totalEstimated: 'total_estimated',
     approvalStatus: 'approval_status',
     createdAt: 'created_at'
   })

   const mapPurchaseOrderLine = createMapper<PurchaseOrderLine>({
     id: 'id',
     purchaseOrderId: 'purchase_order_id',
     supplierItemId: 'supplier_item_id',
     ingredientId: 'ingredient_id',
     requestedQty: 'requested_qty',
     receivedQty: 'received_qty',
     purchaseUnit: 'purchase_unit',
     roundingRule: 'rounding_rule',
     packSize: 'pack_size',
     unitPrice: 'unit_price',
     lineTotal: 'line_total'
   })
   ```

4. **Migrar mappers de otros módulos**
   - `src/modules/events/data/*.ts`
   - `src/modules/recipes/data/*.ts`
   - `src/modules/staff/data/*.ts`
   - `src/modules/scheduling/data/*.ts`

**Día 2: Verificación (2 horas)**

5. **Verificar tests existentes**
   ```bash
   pnpm test
   ```

   - Todos los tests unitarios deben pasar
   - Tests de integración deben pasar
   - Tests E2E deben pasar

6. **Verificar en desarrollo**
   ```bash
   pnpm dev
   ```

   - Navegar por todas las páginas
   - Verificar que los datos se muestran correctamente
   - Probar CRUD operations

#### **Checklist de Verificación:**
- [ ] Helper `mappers.ts` creado
- [ ] Tests de mappers pasando
- [ ] Mappers de purchasing migrados
- [ ] Mappers de events migrados
- [ ] Mappers de recipes migrados
- [ ] Mappers de staff migrados
- [ ] Mappers de scheduling migrados
- [ ] Todos los tests pasando
- [ ] Verificación manual en dev exitosa

#### **Commits sugeridos:**
```bash
git add src/lib/shared/mappers.ts src/lib/shared/mappers.test.ts
git commit -m "feat(mappers): add generic mapper generators

- Create createMapper for explicit field mapping
- Add autoMapper for automatic snake_case conversion
- Support custom transformations
- Add comprehensive tests"

git add src/modules/purchasing/data/orders.ts
git commit -m "refactor(purchasing): migrate to generic mappers

- Replace manual mappers with createMapper
- Reduce code duplication
- Maintain type safety
- All tests passing"

git add src/modules/events/data/*.ts src/modules/recipes/data/*.ts
git commit -m "refactor(data): migrate all modules to generic mappers

- Apply to events, recipes, staff, scheduling
- Eliminate mapper duplication across codebase
- Improve maintainability"
```

#### **Dependencias:**
- Ninguna

#### **Métricas de Éxito:**
- ✅ Reducción de ~200+ líneas de código duplicado
- ✅ Todos los tests pasando
- ✅ No regresiones en funcionalidad
- ✅ Tiempo de desarrollo de nuevos mappers reducido 70%

---

### Issue #5: Aumentar Cobertura de Tests

**Prioridad:** 🟡 MEDIA
**Impacto:** Medio - Calidad
**Esfuerzo:** 3-4 días
**Asignado a:** QA + Developer

#### **Tareas:**

**Día 1: Análisis (2 horas)**

1. **Generar reporte de cobertura**
   ```bash
   pnpm test -- --coverage
   ```

   Identificar módulos con < 70% cobertura:
   - `src/modules/orgs/domain/*`
   - `src/modules/importer/domain/*`
   - `src/lib/shared/logger.ts`
   - `src/lib/shared/userMessages.ts` (nuevo)

**Día 1-2: Tests de orgs (4 horas)**

2. **Tests para orgs domain**

   **Archivo nuevo:** `src/modules/orgs/domain/orgs.test.ts`
   ```typescript
   import { describe, expect, it } from 'vitest'
   // Importar funciones de dominio si existen

   describe('orgs domain', () => {
     it('valida slug de organización', () => {
       // Tests de validación de slug
     })

     it('valida membresía de usuario', () => {
       // Tests de lógica de membresía
     })

     // Más tests según la lógica existente
   })
   ```

**Día 2-3: Tests de importer (6 horas)**

3. **Tests para importer domain**

   **Archivo nuevo:** `src/modules/importer/domain/validation.test.ts`
   ```typescript
   import { describe, expect, it } from 'vitest'
   // Importar funciones de validación de CSV/datos

   describe('importer validation', () => {
     it('valida formato de CSV', () => {
       // Tests de parsing CSV
     })

     it('detecta filas con errores', () => {
       // Tests de detección de errores
     })

     it('transforma datos correctamente', () => {
       // Tests de transformación
     })
   })
   ```

**Día 3-4: Tests de helpers (4 horas)**

4. **Tests para logger**

   **Archivo nuevo:** `src/lib/shared/logger.test.ts`
   ```typescript
   import { describe, expect, it, vi } from 'vitest'
   import { logger } from './logger'

   describe('logger', () => {
     it('formatea mensajes correctamente', () => {
       const consoleSpy = vi.spyOn(console, 'log')

       logger.info('Test message', {
         operation: 'test',
         module: 'testing'
       })

       expect(consoleSpy).toHaveBeenCalledWith(
         expect.stringContaining('Test message')
       )
     })

     // Más tests
   })
   ```

**Día 4: Verificación (2 horas)**

5. **Generar reporte final**
   ```bash
   pnpm test -- --coverage
   ```

   Objetivo: 80%+ cobertura en capa domain

6. **Revisar tests en CI**
   - Verificar que todos los tests pasan en GitHub Actions
   - Añadir badge de cobertura a README (opcional)

#### **Checklist de Verificación:**
- [ ] Tests de orgs domain completos
- [ ] Tests de importer domain completos
- [ ] Tests de logger completos
- [ ] Tests de userMessages completos
- [ ] Cobertura global > 80% en domain
- [ ] Todos los tests pasando
- [ ] CI verde

#### **Commits sugeridos:**
```bash
git add src/modules/orgs/domain/*.test.ts
git commit -m "test(orgs): add domain layer unit tests

- Add tests for org validation
- Add tests for membership logic
- Increase coverage to 85%"

git add src/modules/importer/domain/*.test.ts
git commit -m "test(importer): add domain layer unit tests

- Add CSV parsing tests
- Add validation tests
- Add transformation tests
- Increase coverage to 80%"

git add src/lib/shared/*.test.ts
git commit -m "test(shared): add tests for logger and userMessages

- Add logger formatting tests
- Add userMessages translation tests
- Increase overall coverage to 82%"
```

#### **Dependencias:**
- Issue #2 (userMessages tests)

#### **Métricas de Éxito:**
- ✅ Cobertura > 80% en capa domain
- ✅ Todos los módulos principales con tests
- ✅ CI pasando
- ✅ Confianza en refactors futuros

---

### Issue #6: Optimizar Queries N+1

**Prioridad:** 🟡 MEDIA
**Impacto:** Medio - Performance
**Esfuerzo:** 2-3 días
**Asignado a:** Backend Developer

#### **Estrategia:** Crear RPC unificada para PurchaseOrderDetail

**Día 1: Backend RPC (4 horas)**

1. **Crear función SQL**

   **Archivo nuevo:** `supabase/migrations/20260110000000_rpc_purchase_order_detail.sql`
   ```sql
   -- RPC para obtener pedido con todas sus dependencias en 1 query
   create or replace function get_purchase_order_detail(p_order_id uuid)
   returns jsonb
   language plpgsql
   security definer
   set search_path = public
   as $$
   declare
     v_result jsonb;
     v_org_id uuid;
   begin
     -- Verificar acceso
     select org_id into v_org_id
     from purchase_orders
     where id = p_order_id;

     if not found then
       raise exception 'Purchase order not found';
     end if;

     if not is_org_member(v_org_id) then
       raise exception 'Access denied';
     end if;

     -- Construir resultado unificado
     select jsonb_build_object(
       'order', row_to_json(po.*),
       'lines', coalesce(
         (select jsonb_agg(row_to_json(l.*) order by l.created_at)
          from purchase_order_lines l
          where l.purchase_order_id = p_order_id),
         '[]'::jsonb
       ),
       'supplier', row_to_json(s.*),
       'supplierItems', coalesce(
         (select jsonb_agg(row_to_json(si.*) order by si.name)
          from supplier_items si
          where si.supplier_id = po.supplier_id),
         '[]'::jsonb
       ),
       'ingredients', coalesce(
         (select jsonb_agg(row_to_json(i.*) order by i.name)
          from ingredients i
          where i.hotel_id = po.hotel_id),
         '[]'::jsonb
       )
     ) into v_result
     from purchase_orders po
     join suppliers s on s.id = po.supplier_id
     where po.id = p_order_id;

     return v_result;
   end;
   $$;
   ```

2. **Aplicar migración**
   ```bash
   npx supabase db reset
   ```

**Día 2: Frontend adapter (4 horas)**

3. **Crear función adapter**

   **Archivo:** `src/modules/purchasing/data/orders.ts`
   ```typescript
   // Nuevo tipo de respuesta unificada
   export type PurchaseOrderDetailResponse = {
     order: PurchaseOrder
     lines: PurchaseOrderLine[]
     supplier: Supplier
     supplierItems: SupplierItem[]
     ingredients: Ingredient[]
   }

   // Nueva función
   export async function getPurchaseOrderDetail(
     orderId: string
   ): Promise<PurchaseOrderDetailResponse> {
     if (!orderId) {
       throw new AppError('ValidationError', 'orderId es obligatorio', {
         module: 'purchasing',
         operation: 'getPurchaseOrderDetail',
       })
     }

     const supabase = getSupabaseClient()
     const { data, error } = await supabase.rpc('get_purchase_order_detail', {
       p_order_id: orderId
     })

     if (error) {
       throw mapSupabaseError(error, {
         module: 'purchasing',
         operation: 'getPurchaseOrderDetail',
         orderId,
       })
     }

     if (!data) {
       throw new AppError('NotFoundError', 'Pedido no encontrado', {
         module: 'purchasing',
         operation: 'getPurchaseOrderDetail',
         orderId,
       })
     }

     // Mapear respuesta
     return {
       order: mapPurchaseOrder(data.order),
       lines: data.lines.map(mapPurchaseOrderLine),
       supplier: mapSupplier(data.supplier),
       supplierItems: data.supplierItems.map(mapSupplierItem),
       ingredients: data.ingredients.map(mapIngredient),
     }
   }

   // Nuevo hook
   export function usePurchaseOrderDetail(orderId: string | undefined) {
     return useQuery({
       queryKey: ['purchase_order_detail', orderId],
       queryFn: async () => {
         if (!orderId) throw new Error('OrderId requerido')
         return getPurchaseOrderDetail(orderId)
       },
       enabled: Boolean(orderId),
     })
   }
   ```

4. **Actualizar componente**

   **Archivo:** `src/modules/purchasing/ui/PurchaseOrderDetailPage.tsx`
   ```typescript
   // ❌ ANTES: 4 queries separadas
   const purchaseOrder = usePurchaseOrder(id)
   const suppliers = useSuppliersLite(activeOrgId)
   const supplierItems = useSupplierItemsList(supplierId)
   const ingredients = useIngredients(purchaseOrder.data?.order.hotelId)

   // ✅ DESPUÉS: 1 query unificada
   const detail = usePurchaseOrderDetail(id)

   // Destructuring
   const order = detail.data?.order
   const lines = detail.data?.lines ?? []
   const supplier = detail.data?.supplier
   const supplierItems = detail.data?.supplierItems ?? []
   const ingredients = detail.data?.ingredients ?? []

   // Resto del componente sin cambios
   ```

**Día 3: Testing y optimización (4 horas)**

5. **Tests de la RPC**

   **Archivo nuevo:** `supabase/tests/rpc_purchase_order_detail.test.sql`
   ```sql
   begin;
   select plan(3);

   -- Setup
   insert into orgs (id, name, slug) values ('org-test', 'Test Org', 'test-org');
   insert into hotels (id, org_id, name) values ('hotel-test', 'org-test', 'Hotel Test');
   insert into suppliers (id, org_id, name) values ('supplier-test', 'org-test', 'Supplier Test');
   insert into purchase_orders (id, org_id, hotel_id, supplier_id, order_number, status)
     values ('po-test', 'org-test', 'hotel-test', 'supplier-test', 'PO-001', 'draft');

   -- Test 1: Devuelve datos completos
   select is(
     (select get_purchase_order_detail('po-test')->'order'->>'id'),
     'po-test',
     'RPC devuelve orden correctamente'
   );

   -- Test 2: Incluye supplier
   select is(
     (select get_purchase_order_detail('po-test')->'supplier'->>'id'),
     'supplier-test',
     'RPC incluye proveedor'
   );

   -- Test 3: Error si no existe
   select throws_ok(
     'select get_purchase_order_detail(''00000000-0000-0000-0000-000000000000'')',
     'Purchase order not found'
   );

   select * from finish();
   rollback;
   ```

6. **Medir performance**
   ```typescript
   // Antes (4 queries secuenciales):
   // Query 1: 50ms
   // Query 2: 30ms  (paralela con 1)
   // Query 3: 40ms  (espera query 1)
   // Query 4: 35ms  (espera query 1)
   // Total: ~125ms

   // Después (1 query):
   // Query única: 60ms
   // Total: ~60ms
   // ✅ Mejora: 52% más rápido
   ```

#### **Checklist de Verificación:**
- [ ] Migración SQL creada
- [ ] RPC funcionando correctamente
- [ ] Función adapter creada
- [ ] Hook unificado creado
- [ ] Componente actualizado
- [ ] Tests SQL pasando
- [ ] Tests E2E pasando
- [ ] Performance mejorado > 40%

#### **Commits sugeridos:**
```bash
git add supabase/migrations/20260110000000_rpc_purchase_order_detail.sql
git commit -m "feat(db): add RPC for unified purchase order detail query

- Create get_purchase_order_detail function
- Return order, lines, supplier, items, ingredients in 1 query
- Include RLS checks
- Reduce N+1 queries"

git add src/modules/purchasing/data/orders.ts
git commit -m "feat(purchasing): use unified RPC for order detail

- Add getPurchaseOrderDetail adapter
- Create usePurchaseOrderDetail hook
- Reduce from 4 queries to 1
- ~50% performance improvement"

git add src/modules/purchasing/ui/PurchaseOrderDetailPage.tsx
git commit -m "refactor(ui): migrate to unified order detail query

- Use usePurchaseOrderDetail instead of 4 separate hooks
- Simplify component logic
- Maintain same functionality
- Faster page load"
```

#### **Dependencias:**
- Ninguna

#### **Métricas de Éxito:**
- ✅ Reducción de 4 queries a 1 query
- ✅ Tiempo de carga 40-60% más rápido
- ✅ Todos los tests pasando
- ✅ Sin cambios en UX

---

### Issue #7: Logging Estructurado Consistente

**Prioridad:** 🟡 MEDIA
**Impacto:** Medio - Observabilidad
**Esfuerzo:** 1-2 días
**Asignado a:** DevOps + Backend

*(Ver detalles completos en CODE_REVIEW.md)*

**Resumen:**
- Mejorar logger con requestId
- Aplicar consistentemente en data layer
- Migrar console.log en Edge Functions
- Añadir middleware de logging

**Estimación:** 1-2 días

---

## 🟢 FASE 3: OPTIMIZACIÓN (Backlog, 8-10 días)

### Issue #8: Schemas Zod en Dominio

**Prioridad:** 🟢 BAJA
**Esfuerzo:** 1 día

**Resumen:**
- Mover schemas inline a archivos `domain/schemas.ts`
- Mejorar reutilización
- Facilitar tests

### Issue #9: Optimización de Bundle

**Prioridad:** 🟢 BAJA
**Esfuerzo:** 1 día

**Resumen:**
- Configurar manual chunks en Vite
- Optimizar tree shaking
- Medir impacto en bundle size

### Issue #10: Internacionalización (i18n)

**Prioridad:** 🟢 BAJA
**Esfuerzo:** 5-7 días

**Resumen:**
- Implementar react-i18next
- Extraer todos los strings a archivos de traducción
- Preparar para expansión internacional

*(Solo si hay roadmap internacional)*

---

## 📊 RESUMEN DE ESFUERZOS

### Por Prioridad:
| Prioridad | Issues | Días Estimados |
|-----------|--------|----------------|
| 🔴 Crítica | 1 | 0.06 días (30 min) |
| 🟠 Alta | 3 | 4-5 días |
| 🟡 Media | 4 | 6-7 días |
| 🟢 Baja | 2 | 6-8 días |
| **TOTAL** | **10** | **16-20 días** |

### Por Sprint:
| Sprint | Fase | Issues | Días |
|--------|------|--------|------|
| 0 (Hoy) | Crítico | #1 | 0.06 |
| 1-2 (Sem 1-2) | Fundacional | #2, #3 | 4-5 |
| 3-4 (Sem 3-4) | Calidad | #4, #5, #6, #7 | 8-10 |
| Backlog | Optimización | #8, #9, #10 | 7-9 |

---

## 🎯 OBJETIVOS SMART

### Sprint 0 (HOY):
- [x] Revocar API key expuesta
- [x] Implementar gestión segura de secrets
- [x] Tests de OCR function pasando

### Sprint 1-2 (Semana 1-2):
- [ ] 100% mensajes de error user-friendly
- [ ] Rate limiting activo en 3 Edge Functions
- [ ] Reducción 0% en costos de Gemini por abuso

### Sprint 3-4 (Semana 3-4):
- [ ] Cobertura de tests > 80%
- [ ] Reducción 200+ líneas de código duplicado
- [ ] Performance mejorado 40%+ en PurchaseOrderDetail

### A largo plazo:
- [ ] Puntuación de código: 8.7 → 9.2+
- [ ] Deuda técnica reducida 70%
- [ ] Tiempo de onboarding nuevos devs reducido 50%

---

## 🚦 CRITERIOS DE ÉXITO

### Técnicos:
- ✅ 100% tests pasando
- ✅ 0 vulnerabilidades de seguridad críticas
- ✅ Cobertura > 80% en domain layer
- ✅ Performance mejorado > 30%
- ✅ Deuda técnica reducida significativamente

### Negocio:
- ✅ Costos de IA bajo control (rate limiting)
- ✅ UX mejorada (mensajes claros)
- ✅ Tiempo de desarrollo reducido (menos duplicación)
- ✅ Confianza en deploys (más tests)

---

## 📅 TIMELINE RECOMENDADO

```
Semana 0 (Hoy):
├─ 09:00-09:30 → Issue #1 (API key) 🔴

Semana 1:
├─ Lunes-Martes → Issue #2 (User messages) 🟠
└─ Miércoles → Issue #3 (Rate limiting) 🟠

Semana 2:
├─ Lunes-Martes → Issue #4 (Mappers) 🟡
└─ Miércoles-Viernes → Issue #5 (Tests) 🟡

Semana 3:
├─ Lunes-Martes → Issue #6 (N+1) 🟡
└─ Miércoles-Jueves → Issue #7 (Logging) 🟡

Backlog (cuando haya capacidad):
├─ Issue #8 (Schemas) 🟢
├─ Issue #9 (Bundle) 🟢
└─ Issue #10 (i18n) 🟢 - Solo si hay roadmap internacional
```

---

## 🔄 PROCESO DE REVISIÓN

Para cada issue:
1. **Desarrollo** → PR en GitHub
2. **Code Review** → Al menos 1 aprobación
3. **Tests** → CI verde obligatorio
4. **QA Manual** → Verificación en staging
5. **Deploy** → Merge a main
6. **Monitoreo** → Verificar métricas 24-48h

---

## 📞 CONTACTOS

**Para consultas técnicas:**
- Backend: [Backend Lead]
- Frontend: [Frontend Lead]
- DevOps: [DevOps Lead]
- QA: [QA Lead]

**Escalación:**
- Bloqueantes críticos → CTO
- Decisiones arquitectónicas → Tech Lead

---

## 📚 RECURSOS

- [CODE_REVIEW.md](./CODE_REVIEW.md) - Revisión completa
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura del proyecto
- [DECISIONS.md](./DECISIONS.md) - ADRs existentes
- [Supabase Docs](https://supabase.com/docs) - Documentación oficial
- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview) - TanStack Query

---

**Última actualización:** 2026-01-09
**Próxima revisión:** Después de completar Sprint 1-2
