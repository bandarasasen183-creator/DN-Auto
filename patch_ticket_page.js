const fs = require('fs');
const file = 'app/worker/tickets/[id]/page.js';
let content = fs.readFileSync(file, 'utf8');

// Import duration
content = content.replace(
  "import { TICKET_STATUS, elapsed, promiseState }",
  "import { TICKET_STATUS, elapsed, promiseState, duration }"
);

// Replace the timeline section
const timelineOld = `<h3 style={{ marginTop: 0 }}>Today</h3>
            <ol className="timeline">
              <li>
                <strong>Arrived</strong>
                <span className="small muted">
                  {stamp(ticket.opened_at)}
                  {ticket.opener?.full_name ? \` · booked in by \${ticket.opener.full_name}\` : ''}
                </span>
              </li>
              {ticket.started_at && (
                <li><strong>Work started</strong><span className="small muted">{stamp(ticket.started_at)}</span></li>
              )}
              {ticket.ready_at && (
                <li><strong>Ready</strong><span className="small muted">{stamp(ticket.ready_at)}</span></li>
              )}
              {ticket.collected_at && (
                <li><strong>Collected</strong><span className="small muted">{stamp(ticket.collected_at)}</span></li>
              )}
            </ol>`;

const timelineNew = `<h3 style={{ marginTop: 0 }}>Timeline</h3>
            <ol className="timeline">
              <li>
                <strong>Arrived</strong>
                <span className="small muted">
                  {stamp(ticket.opened_at)}
                  {ticket.opener?.full_name ? \` · \${ticket.opener.full_name}\` : ''}
                </span>
              </li>
              {ticket.started_at && (
                <li>
                  <strong>Work started</strong>
                  <span className="small muted">
                    {stamp(ticket.started_at)}
                    <br/>
                    <span className="form-note">Waited: {duration(ticket.opened_at, ticket.started_at)}</span>
                  </span>
                </li>
              )}
              {ticket.ready_at && (
                <li>
                  <strong>Ready</strong>
                  <span className="small muted">
                    {stamp(ticket.ready_at)}
                    <br/>
                    <span className="form-note">In progress: {duration(ticket.started_at || ticket.opened_at, ticket.ready_at)}</span>
                  </span>
                </li>
              )}
              {ticket.collected_at && (
                <li>
                  <strong>Collected</strong>
                  <span className="small muted">
                    {stamp(ticket.collected_at)}
                    <br/>
                    <span className="form-note">Sat ready: {duration(ticket.ready_at || ticket.started_at || ticket.opened_at, ticket.collected_at)}</span>
                  </span>
                </li>
              )}
            </ol>
            <p className="small muted" style={{ marginTop: '1rem', borderTop: '1px solid var(--surface-sunken)', paddingTop: '0.5rem' }}>
              <strong>Total time here:</strong> {duration(ticket.opened_at, ticket.collected_at || new Date())}
            </p>`;

content = content.replace(timelineOld, timelineNew);

fs.writeFileSync(file, content);
