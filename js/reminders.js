// Due-date reminders: browser notification + EmailJS email (same EmailJS account,
// service, template and recipient as the original page).
import { api } from './api.js';
import { today } from './dates.js';

const EMAILJS_SRC = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
const EMAILJS_PUBLIC_KEY = 'w65eUqIpJs7dhbjNC';
const EMAILJS_SERVICE = 'service_cen6e1r';
const EMAILJS_TEMPLATE = 'template_xjmehjt';
const OWNER_EMAIL = 'janetburns@mcleodconsulting.com';

let emailReady = null;
function loadEmailJS() {
  if (!emailReady) {
    emailReady = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = EMAILJS_SRC;
      s.onload = () => { try { window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); resolve(window.emailjs); } catch (e) { reject(e); } };
      s.onerror = () => reject(new Error('EmailJS failed to load'));
      document.head.appendChild(s);
    });
  }
  return emailReady;
}

function notify(task) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification('📋 Task Due Today', { body: `"${task.name}" is due ${task.due}` }); } catch { /* ignore */ }
}

let running = false;
// tasks: [{row, table, personal}]. Runs only after data has loaded (fixes the old race
// where reminders were checked against empty lists). Each reminder is claimed with a
// conditional PATCH (reminder_sent=false -> true) so two open tabs/devices never both email.
export async function checkReminders(tasks) {
  if (running) return;
  running = true;
  try {
    const t = today();
    const due = tasks.filter(({ row }) => row.reminder && row.due === t && !row.reminder_sent && !row.completed);
    if (!due.length) return;
    let emailjs = null;
    try { emailjs = await loadEmailJS(); } catch (e) { console.error(e); return; }
    for (const { row, table, personal } of due) {
      let claimed;
      try { claimed = await api.update(table, row.id, { reminder_sent: true }, '&reminder_sent=eq.false'); }
      catch (e) { console.error('Reminder claim failed', e); continue; }
      row.reminder_sent = true;
      if (!claimed) continue; // another tab/device already sent it
      notify(row);
      try {
        await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
          to_email: OWNER_EMAIL, task_name: row.name, due_date: row.due,
          task_type: personal ? 'Personal Task' : 'Work Task',
          message: `Your task "${row.name}" is due today (${row.due}). Open your tracker to review and mark it complete.`,
        });
      } catch (e) {
        console.error('Reminder email failed', e);
        row.reminder_sent = false; // release the claim so the next load retries
        api.update(table, row.id, { reminder_sent: false }).catch(() => {});
      }
    }
  } finally { running = false; }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    try { Notification.requestPermission(); } catch { /* ignore */ }
  }
}
