import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addOrganizationMember,
  getOrganizationMembers,
  listOrganizations,
  removeOrganizationMember,
  updateOrganizationMember,
} from '../api/organizations'
import useAuth from '../hooks/useAuth'
import './OrganizationsPage.css'

const emptyMemberForm = {
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  password: '',
  role: 'member',
}

const ROLE_LABELS = {
  admin: 'Administrator',
  coordinator: 'Koordynator',
  member: 'Członek',
}

function generatePassword(length = 12) {
  const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789@$!%*#?&'
  let password = ''
  const cryptoObj = window.crypto || window.msCrypto
  if (cryptoObj?.getRandomValues) {
    const randomValues = new Uint32Array(length)
    cryptoObj.getRandomValues(randomValues)
    for (let i = 0; i < length; i += 1) {
      password += charset[randomValues[i] % charset.length]
    }
  } else {
    for (let i = 0; i < length; i += 1) {
      const randomIndex = Math.floor(Math.random() * charset.length)
      password += charset[randomIndex]
    }
  }
  return password
}

function generateUsername(prefix = 'member') {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${suffix}`
}

function OrganizationsPage() {
  const { user, organization: activeOrganization } = useAuth()
  const [organizations, setOrganizations] = useState([])
  const [organizationsLoading, setOrganizationsLoading] = useState(false)
  const [organizationsError, setOrganizationsError] = useState(null)
  const [selectedOrgId, setSelectedOrgId] = useState(null)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberError, setMemberError] = useState(null)
  const [memberForm, setMemberForm] = useState(emptyMemberForm)
  const [memberSubmitting, setMemberSubmitting] = useState(false)
  const [lastCreatedCredentials, setLastCreatedCredentials] = useState(null)
  const [memberSuccess, setMemberSuccess] = useState(null)

  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.id === selectedOrgId) ?? null,
    [organizations, selectedOrgId],
  )

  const isAdmin = selectedOrganization?.role === 'admin'

  const loadOrganizations = useCallback(async () => {
    setOrganizationsLoading(true)
    setOrganizationsError(null)
    try {
      const data = await listOrganizations()
      setOrganizations(data)
      const preferredOrg =
        activeOrganization && data.find((org) => org.id === activeOrganization.id || org.slug === activeOrganization.slug)
      if (preferredOrg) {
        setSelectedOrgId(preferredOrg.id)
      } else if (!selectedOrgId && data.length > 0) {
        setSelectedOrgId(data[0].id)
      } else if (selectedOrgId && !data.some((org) => org.id === selectedOrgId)) {
        setSelectedOrgId(data[0]?.id ?? null)
      }
    } catch (error) {
      setOrganizationsError(error.response?.data?.detail ?? 'Nie udało się pobrać organizacji.')
    } finally {
      setOrganizationsLoading(false)
    }
  }, [selectedOrgId, activeOrganization])

  useEffect(() => {
    if (!activeOrganization) {
      return
    }
    setSelectedOrgId((current) => {
      if (current) {
        return current
      }
      return activeOrganization.id ?? current
    })
  }, [activeOrganization])

  const loadMembers = useCallback(async (organizationId) => {
    if (!organizationId) {
      setMembers([])
      return
    }
    setMembersLoading(true)
    setMemberError(null)
    try {
      const data = await getOrganizationMembers(organizationId)
      setMembers(data)
    } catch (error) {
      setMemberError(error.response?.data?.detail ?? 'Nie udało się pobrać członków organizacji.')
    } finally {
      setMembersLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrganizations()
  }, [loadOrganizations])

  useEffect(() => {
    if (selectedOrgId) {
      loadMembers(selectedOrgId)
    }
  }, [selectedOrgId, loadMembers])

  const handleMemberFormChange = (event) => {
    const { name, value } = event.target
    setMemberForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleGenerateCredentials = () => {
    setMemberForm((prev) => ({
      ...prev,
      username: prev.username || generateUsername(selectedOrganization?.slug ?? 'member'),
      password: generatePassword(),
    }))
  }

  const handleAddMember = async (event) => {
    event.preventDefault()
    if (!selectedOrgId) return
    setMemberSubmitting(true)
    setMemberError(null)
    setMemberSuccess(null)
    setLastCreatedCredentials(null)

    const payload = {
      username: memberForm.username,
      password: memberForm.password,
      first_name: memberForm.first_name,
      last_name: memberForm.last_name,
      email: memberForm.email,
      role: memberForm.role,
    }

    try {
      await addOrganizationMember(selectedOrgId, payload)
      await loadMembers(selectedOrgId)
      setMemberSuccess('Nowy użytkownik został dodany do organizacji.')
      setLastCreatedCredentials({ username: payload.username, password: payload.password })
      setMemberForm((prev) => ({
        ...emptyMemberForm,
        role: prev.role,
      }))
    } catch (error) {
      setMemberError(error.response?.data?.detail ?? 'Nie udało się dodać członka.')
    } finally {
      setMemberSubmitting(false)
    }
  }

  const handleRoleChange = async (memberId, newRole) => {
    if (!selectedOrgId) return
    try {
      await updateOrganizationMember(selectedOrgId, memberId, { role: newRole })
      await loadMembers(selectedOrgId)
    } catch (error) {
      setMemberError(error.response?.data?.detail ?? 'Nie udało się zaktualizować roli.')
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!selectedOrgId) return
    if (!window.confirm('Czy na pewno chcesz usunąć tego członka?')) return
    try {
      await removeOrganizationMember(selectedOrgId, memberId)
      await loadMembers(selectedOrgId)
    } catch (error) {
      setMemberError(error.response?.data?.detail ?? 'Nie udało się usunąć członka.')
    }
  }

  if (organizationsLoading && !selectedOrganization) {
    return (
      <div className="organizations-page">
        <div className="card loading-card">
          <p>Ładujemy dane organizacji…</p>
        </div>
      </div>
    )
  }

  if (!selectedOrganization) {
    return (
      <div className="organizations-page">
        <div className="card empty-state">
          <h2>Brak powiązanej organizacji</h2>
          {organizationsError ? (
            <p>{organizationsError}</p>
          ) : (
            <p>Twoje konto nie jest jeszcze przypisane do żadnej organizacji. Skontaktuj się z administratorem.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="organizations-page">
      <section className="card organization-summary">
        <div>
          <p className="eyebrow">Organizacja</p>
          <h1>{selectedOrganization.name}</h1>
          <p className="description">{selectedOrganization.description || 'Brak opisu organizacji.'}</p>
        </div>
        <div className="summary-meta">
          <span className="badge">{ROLE_LABELS[selectedOrganization.role] ?? selectedOrganization.role}</span>
          <span className="meta">{selectedOrganization.member_count} członków</span>
          <span className="meta">Administrator: {user?.first_name || user?.username}</span>
        </div>
      </section>

      {organizationsError && <p className="status error">{organizationsError}</p>}
      {memberError && <p className="status error">{memberError}</p>}
      {memberSuccess && <p className="status success">{memberSuccess}</p>}

      {lastCreatedCredentials && (
        <div className="card credentials-callout">
          <h2>Dane nowego użytkownika</h2>
          <p>Zapisz te dane i przekaż użytkownikowi. Hasło nie będzie widoczne ponownie.</p>
          <div className="credentials-grid">
            <span>Login:</span>
            <code>{lastCreatedCredentials.username}</code>
            <span>Hasło:</span>
            <code>{lastCreatedCredentials.password}</code>
          </div>
        </div>
      )}

      <section className="card members">
        <header>
          <h2>Członkowie</h2>
          <span>{members.length} osób</span>
        </header>
        {membersLoading ? (
          <p>Ładowanie członków…</p>
        ) : members.length === 0 ? (
          <p>Brak członków w tej organizacji.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Użytkownik</th>
                <th>Kontakt</th>
                <th>Rola</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.username}</strong>
                    <br />
                    <small>
                      {member.first_name} {member.last_name}
                    </small>
                  </td>
                  <td>
                    <small>{member.email || '—'}</small>
                  </td>
                  <td>
                    {isAdmin ? (
                      <select
                        value={member.role}
                        onChange={(event) => handleRoleChange(member.id, event.target.value)}
                        disabled={member.user === user?.id}
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>{ROLE_LABELS[member.role] ?? member.role}</span>
                    )}
                  </td>
                  <td>
                    {isAdmin && member.user !== user?.id ? (
                      <button type="button" className="link" onClick={() => handleRemoveMember(member.id)}>
                        Usuń
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {isAdmin ? (
        <section className="card add-member">
          <h2>Dodaj nowego członka</h2>
          <p>Wygeneruj dane logowania, a następnie przekaż je nowemu użytkownikowi.</p>
          <form onSubmit={handleAddMember} className="member-form">
            <div className="form-row">
              <label className="field">
                <span>Imię</span>
                <input name="first_name" value={memberForm.first_name} onChange={handleMemberFormChange} />
              </label>
              <label className="field">
                <span>Nazwisko</span>
                <input name="last_name" value={memberForm.last_name} onChange={handleMemberFormChange} />
              </label>
            </div>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" value={memberForm.email} onChange={handleMemberFormChange} />
            </label>
            <div className="form-row">
              <label className="field">
                <span>Login</span>
                <input
                  name="username"
                  value={memberForm.username}
                  onChange={handleMemberFormChange}
                  placeholder="np. member-abc123"
                  required
                />
              </label>
              <label className="field">
                <span>Hasło</span>
                <input
                  name="password"
                  type="text"
                  value={memberForm.password}
                  onChange={handleMemberFormChange}
                  placeholder="Wygeneruj bezpieczne hasło"
                  required
                />
              </label>
            </div>
            <div className="form-row form-row--align">
              <label className="field">
                <span>Rola</span>
                <select name="role" value={memberForm.role} onChange={handleMemberFormChange}>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="secondary" onClick={handleGenerateCredentials}>
                Wygeneruj dane logowania
              </button>
            </div>
            <div className="actions">
              <button type="submit" disabled={memberSubmitting}>
                {memberSubmitting ? 'Dodawanie…' : 'Dodaj członka'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <p className="muted">Tylko administratorzy mogą dodawać nowych członków.</p>
      )}
    </div>
  )
}

export default OrganizationsPage
