import { setUserRole, setUserActive } from '@/app/admin/actions';

/**
 * Shared people list for the customers and workers admin pages. Role changes
 * are the only way staff accounts come into existence.
 */
export default function PeopleTable({ people, emptyMessage }) {
  if (!people.length) {
    return <div className="card center muted">{emptyMessage}</div>;
  }

  return (
    <div className="card table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>Role</th>
            <th>Account</th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id}>
              <td>
                <strong>{p.full_name}</strong>
                <br />
                <span className="small muted">since {new Date(p.created_at).toLocaleDateString('en-LK')}</span>
              </td>
              <td className="small">
                {p.email}
                {p.phone && <><br />{p.phone}</>}
              </td>
              <td>
                <form action={setUserRole} className="row">
                  <input type="hidden" name="user_id" value={p.id} />
                  <select className="select small" name="role" defaultValue={p.role} style={{ width: 'auto' }}>
                    <option value="customer">Customer</option>
                    <option value="worker">Worker</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit" className="btn btn--ghost small">Set</button>
                </form>
              </td>
              <td>
                <form action={setUserActive}>
                  <input type="hidden" name="user_id" value={p.id} />
                  <input type="hidden" name="is_active" value={p.is_active ? 'false' : 'true'} />
                  <button type="submit" className="btn btn--ghost small">
                    {p.is_active ? 'Suspend' : 'Restore'}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
