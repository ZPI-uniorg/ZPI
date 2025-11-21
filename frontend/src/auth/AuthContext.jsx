import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import apiClient from '../api/client'

const TOKEN_STORAGE_KEY = 'uniorg.auth.tokens'
const USER_STORAGE_KEY = 'uniorg.auth.user'
const ORGANIZATION_STORAGE_KEY = 'uniorg.auth.organization'

const AuthContext = createContext(null)

const normalizeOrganizationSlug = (value) => {
  if (!value) {
    return ''
  }

  const normalized = typeof value.normalize === 'function' ? value.normalize('NFKD') : value
  const withoutDiacritics = normalized.replace(/[\u0300-\u036f]/g, '')
  const stripped = withoutDiacritics.replace(/[^a-zA-Z0-9\s_-]/g, '')

  return stripped
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function AuthProvider({ children }) {
  const [tokens, setTokens] = useState(() => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [organization, setOrganization] = useState(() => {
    const stored = localStorage.getItem(ORGANIZATION_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  })

  useEffect(() => {
    if (tokens) {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  }, [tokens])

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_STORAGE_KEY)
    }
  }, [user])

  useEffect(() => {
    if (organization) {
      localStorage.setItem(ORGANIZATION_STORAGE_KEY, JSON.stringify(organization))
    } else {
      localStorage.removeItem(ORGANIZATION_STORAGE_KEY)
    }
  }, [organization])

  const establishSession = useCallback((session) => {
    if (!session) return
    setTokens(session.token)
    setUser(session.user)
    setOrganization(session.organization ?? null)
  }, [])

  const login = useCallback(
    async (credentials) => {
      const rawOrganization = credentials.organization?.trim()
      const organizationSlug = normalizeOrganizationSlug(rawOrganization)
      if (!organizationSlug) {
        throw new Error('Organization identifier is required')
      }

      const params = new URLSearchParams()
      params.append('username', credentials.username ?? '')
      params.append('password', credentials.password ?? '')

      const response = await apiClient.post(
        `auth/login/${encodeURIComponent(organizationSlug)}/`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )

      const data = response.data ?? {}

      if (data.status && data.status !== 'success') {
        const errorMessage = data.message ?? 'Nie udało się zalogować.'
        throw Object.assign(new Error(errorMessage), { response: { data } })
      }

      const session = {
        token: {
          access: data.access,
          refresh: data.refresh,
        },
        user: data.user ?? {
          username: credentials.username ?? '',
        },
        organization: data.organization
          ? { ...data.organization, slug: organizationSlug, original: rawOrganization }
          : { slug: organizationSlug, name: rawOrganization, original: rawOrganization },
      }

      establishSession(session)
      return session.user
    },
    [establishSession],
  )

  const logout = useCallback(async () => {
    const organizationSlug = organization?.slug?.trim()
    if (organizationSlug) {
      try {
        await apiClient.post(`auth/logout/${encodeURIComponent(organizationSlug)}/`)
      } catch (error) {
        console.error('Failed to revoke session on server', error)
      }
    }

    setTokens(null)
    setUser(null)
    setOrganization(null)
  }, [tokens, organization])

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }) => {
      const params = new URLSearchParams()
      params.append('old_password', currentPassword)
      params.append('new_password', newPassword)

      await apiClient.post('auth/change-password/', params)
    },
    [],
  )

  const refreshPromiseRef = useRef()

  useEffect(() => {
    const requestInterceptor = apiClient.interceptors.request.use((config) => {
      if (tokens?.access) {
        config.headers.Authorization = `Bearer ${tokens.access}`
      }
      return config
    })

    const responseInterceptor = apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const status = error.response?.status
        const originalRequest = error.config

        if (status === 401 && tokens?.refresh && !originalRequest?._retry) {
          originalRequest._retry = true

          if (!refreshPromiseRef.current) {
            refreshPromiseRef.current = apiClient
              .post('auth/token/refresh/', { refresh: tokens.refresh })
              .then((response) => {
                setTokens((prev) => ({
                  ...prev,
                  access: response.data.access,
                  refresh: response.data.refresh ?? prev?.refresh,
                }))
                return response.data
              })
              .finally(() => {
                refreshPromiseRef.current = null
              })
          }

          try {
            const refreshed = await refreshPromiseRef.current
            originalRequest.headers.Authorization = `Bearer ${refreshed.access}`
            return apiClient(originalRequest)
          } catch (refreshError) {
            refreshPromiseRef.current = null
            await logout()
            return Promise.reject(refreshError)
          }
        }

        if (status === 401) {
          await logout()
        }

        return Promise.reject(error)
      },
    )

    return () => {
      apiClient.interceptors.request.eject(requestInterceptor)
      apiClient.interceptors.response.eject(responseInterceptor)
    }
  }, [tokens, logout])

  const value = useMemo(
    () => ({
      user,
      tokens,
      organization,
      isAuthenticated: Boolean(user && tokens?.access),
      login,
      logout,
      changePassword,
      establishSession,
    }),
    [user, tokens, organization, login, logout, changePassword, establishSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export default AuthContext
