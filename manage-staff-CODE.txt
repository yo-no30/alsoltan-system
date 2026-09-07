// Supabase Edge Function: create/update staff accounts (admin only)
// Deploy: supabase functions deploy manage-staff
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto in hosted)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

type StaffRole = 'admin' | 'cashier'

interface CreateBody {
  action: 'create'
  email: string
  password: string
  full_name: string
  role: StaffRole
}

interface UpdateProfileBody {
  action: 'update_profile'
  user_id: string
  full_name: string
  role: StaffRole
  is_active: boolean
}

interface ResetPasswordBody {
  action: 'reset_password'
  user_id: string
  password: string
}

type RequestBody = CreateBody | UpdateProfileBody | ResetPasswordBody

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isRole(value: unknown): value is StaffRole {
  return value === 'admin' || value === 'cashier'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, message: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        { ok: false, message: 'إعدادات الخادم غير مكتملة' },
        500,
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ ok: false, message: 'غير مصرح' }, 401)
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser()

    if (callerError || !caller) {
      return jsonResponse({ ok: false, message: 'جلسة غير صالحة' }, 401)
    }

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', caller.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return jsonResponse(
        { ok: false, message: 'هذه العملية متاحة للمدير فقط' },
        403,
      )
    }

    if (callerProfile.is_active === false) {
      return jsonResponse({ ok: false, message: 'حسابك غير نشط' }, 403)
    }

    const body = (await req.json()) as RequestBody

    if (body.action === 'create') {
      const email = body.email?.trim().toLowerCase() ?? ''
      const password = body.password ?? ''
      const fullName = body.full_name?.trim() ?? ''
      const role = body.role

      if (!email || !email.includes('@')) {
        return jsonResponse({ ok: false, message: 'البريد الإلكتروني غير صالح' }, 400)
      }
      if (password.length < 6) {
        return jsonResponse(
          { ok: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
          400,
        )
      }
      if (!fullName) {
        return jsonResponse({ ok: false, message: 'الاسم الكامل مطلوب' }, 400)
      }
      if (!isRole(role)) {
        return jsonResponse({ ok: false, message: 'الدور غير صالح' }, 400)
      }

      const { data: created, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, role },
        })

      if (createError || !created.user) {
        const message = createError?.message?.includes('already been registered')
          ? 'هذا البريد مسجّل مسبقاً'
          : createError?.message || 'تعذر إنشاء المستخدم'
        return jsonResponse({ ok: false, message }, 400)
      }

      const { data: profile, error: upsertError } = await adminClient
        .from('profiles')
        .upsert(
          {
            id: created.user.id,
            full_name: fullName,
            role,
            email,
            is_active: true,
          },
          { onConflict: 'id' },
        )
        .select('*')
        .single()

      if (upsertError || !profile) {
        await adminClient.auth.admin.deleteUser(created.user.id)
        return jsonResponse(
          {
            ok: false,
            message: upsertError?.message || 'تعذر حفظ ملف المستخدم',
          },
          400,
        )
      }

      return jsonResponse({ ok: true, data: profile })
    }

    if (body.action === 'update_profile') {
      const userId = body.user_id?.trim() ?? ''
      const fullName = body.full_name?.trim() ?? ''
      const role = body.role
      const isActive = Boolean(body.is_active)

      if (!userId) {
        return jsonResponse({ ok: false, message: 'معرف المستخدم مطلوب' }, 400)
      }
      if (!fullName) {
        return jsonResponse({ ok: false, message: 'الاسم الكامل مطلوب' }, 400)
      }
      if (!isRole(role)) {
        return jsonResponse({ ok: false, message: 'الدور غير صالح' }, 400)
      }
      if (userId === caller.id && !isActive) {
        return jsonResponse(
          { ok: false, message: 'لا يمكنك تعطيل حسابك الحالي' },
          400,
        )
      }
      if (userId === caller.id && role !== 'admin') {
        return jsonResponse(
          { ok: false, message: 'لا يمكنك إزالة صلاحية المدير عن نفسك' },
          400,
        )
      }

      const { data: profile, error } = await adminClient
        .from('profiles')
        .update({
          full_name: fullName,
          role,
          is_active: isActive,
        })
        .eq('id', userId)
        .select('*')
        .single()

      if (error || !profile) {
        return jsonResponse(
          { ok: false, message: error?.message || 'تعذر تحديث المستخدم' },
          400,
        )
      }

      if (!isActive) {
        await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: '876000h',
        })
      } else {
        await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: 'none',
        })
      }

      return jsonResponse({ ok: true, data: profile })
    }

    if (body.action === 'reset_password') {
      const userId = body.user_id?.trim() ?? ''
      const password = body.password ?? ''

      if (!userId) {
        return jsonResponse({ ok: false, message: 'معرف المستخدم مطلوب' }, 400)
      }
      if (password.length < 6) {
        return jsonResponse(
          { ok: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
          400,
        )
      }

      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        password,
      })

      if (error) {
        return jsonResponse(
          { ok: false, message: error.message || 'تعذر تحديث كلمة المرور' },
          400,
        )
      }

      return jsonResponse({ ok: true })
    }

    return jsonResponse({ ok: false, message: 'إجراء غير معروف' }, 400)
  } catch (error) {
    console.error('[manage-staff]', error)
    return jsonResponse({ ok: false, message: 'خطأ غير متوقع في الخادم' }, 500)
  }
})
