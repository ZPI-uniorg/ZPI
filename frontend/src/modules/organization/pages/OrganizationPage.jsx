import { useState } from "react";
import { FAKE_MEMBERS, TAGS } from "../../../api/fakeData.js";

export default function OrganizationPage() {
  const [members, setMembers] = useState(FAKE_MEMBERS);
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [editingTagsId, setEditingTagsId] = useState(null);
  const [editTags, setEditTags] = useState([]);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  const handleEditTags = (member) => {
    setEditingTagsId(member.id);
    setEditTags(member.tags || []);
  };

  const handleSaveTags = (memberId) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, tags: [...editTags] } : m
      )
    );
    setEditingTagsId(null);
    setEditTags([]);
  };

  const handleCancelTags = () => {
    setEditingTagsId(null);
    setEditTags([]);
  };

  const handleToggleTag = (tag) => {
    setEditTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAdd = (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email || !email.includes("@")) {
      setError("Podaj poprawny email.");
      return;
    }
    setInfo("Zaproszenie zostało wysłane. Użytkownik otrzyma e-mail z instrukcją dołączenia do organizacji.");
    setEmail("");
  };

  const handleRemove = (memberId) => {
    setConfirmRemoveId(memberId);
  };
  const handleRemoveConfirm = (memberId) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setConfirmRemoveId(null);
  };
  const handleRemoveCancel = () => {
    setConfirmRemoveId(null);
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-slate-100">Członkowie organizacji</h1>
      <form
        onSubmit={handleAdd}
        className="flex items-end gap-3 mb-8 bg-slate-800 rounded-xl p-4 shadow"
      >
        <div className="flex flex-col flex-1">
          <label className="mb-1 text-slate-200 font-medium">Email nowego członka</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="rounded px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-400"
            placeholder="np. jan.kowalski@uni.edu"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-5 py-2 rounded font-semibold"
        >
          Dodaj
        </button>
      </form>
      {error && <div className="mb-4 text-red-400">{error}</div>}
      {info && <div className="mb-4 text-green-400">{info}</div>}
      <div className="bg-slate-800 rounded-xl shadow p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-3 text-slate-100">Lista członków</h2>
        <table className="w-full min-w-[1200px] text-left">
          <thead>
            <tr className="text-slate-300">
              <th className="py-2 px-4 w-[220px]">Login</th>
              <th className="py-2 px-4 w-[300px]">Email</th>
              <th className="py-2 px-4 w-[140px]">Rola</th>
              <th className="py-2 px-4 w-[340px]">Tagi</th>
              <th className="py-2 px-4 w-[260px]"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-t border-slate-700 align-top">
                <td className="py-2 px-4 text-slate-100">{member.username}</td>
                <td className="py-2 px-4 text-slate-100">{member.email}</td>
                <td className="py-2 px-4 text-slate-100">{member.role}</td>
                <td className="py-2 px-4">
                  {editingTagsId === member.id ? (
                    <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
                      {TAGS.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`px-2 py-0.5 rounded-full text-xs border ${
                            editTags.includes(tag)
                              ? "bg-violet-600 text-white border-violet-600"
                              : "bg-slate-700 text-slate-200 border-slate-600"
                          }`}
                          onClick={() => handleToggleTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
                      {(member.tags && member.tags.length > 0) ? (
                        member.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full text-xs bg-violet-700 text-white"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">brak</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-2 px-4">
                  <div className="flex gap-6 items-center min-h-[32px]">
                    {editingTagsId === member.id ? (
                      <>
                        <button
                          className="text-green-400 hover:underline px-2"
                          onClick={() => handleSaveTags(member.id)}
                          type="button"
                        >
                          Zapisz
                        </button>
                        <button
                          className="text-slate-400 hover:underline px-2"
                          onClick={handleCancelTags}
                          type="button"
                        >
                          Anuluj
                        </button>
                        <span className="inline-block w-[110px]" />
                      </>
                    ) : (
                      <>
                        <button
                          className="text-indigo-400 hover:underline px-2"
                          onClick={() => handleEditTags(member)}
                          type="button"
                        >
                          Edytuj tagi
                        </button>
                        <span className="inline-block w-[110px]">
                          {confirmRemoveId === member.id ? (
                            <span className="flex gap-1 items-center">
                              <span className="text-red-400 text-sm">Czy na pewno?</span>
                              <button
                                className="text-red-400 hover:underline px-1"
                                onClick={() => handleRemoveConfirm(member.id)}
                                type="button"
                              >
                                Tak
                              </button>
                              <button
                                className="text-slate-400 hover:underline px-1"
                                onClick={handleRemoveCancel}
                                type="button"
                              >
                                Nie
                              </button>
                            </span>
                          ) : (
                            <button
                              className="text-red-400 hover:underline px-2"
                              onClick={() => handleRemove(member.id)}
                              type="button"
                            >
                              Usuń członka
                            </button>
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
