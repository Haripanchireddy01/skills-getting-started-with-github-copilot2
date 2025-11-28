document.addEventListener('DOMContentLoaded', () => {
  const activitiesList = document.getElementById('activities-list');
  const template = document.getElementById('activity-template');
  const activitySelect = document.getElementById('activity');
  const signupForm = document.getElementById('signup-form');
  const emailInput = document.getElementById('email');
  const messageEl = document.getElementById('message');

  function showMessage(text, type = 'info', timeout = 4000) {
    messageEl.className = ''; // reset
    messageEl.classList.add('message', type);
    messageEl.textContent = text;
    messageEl.classList.remove('hidden');
    if (timeout) setTimeout(() => messageEl.classList.add('hidden'), timeout);
  }

  function initialsFromEmail(email) {
    const name = email.split('@')[0];
    const parts = name.split(/[._-]/).filter(Boolean);
    const first = (parts[0] || '').charAt(0) || '';
    const second = (parts[1] || '').charAt(0) || (parts[0] || '').charAt(1) || '';
    return (first + second).toUpperCase() || email.slice(0, 2).toUpperCase();
  }

  async function loadActivities() {
    try {
      const res = await fetch('/activities', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load activities');
      const activities = await res.json();

      // Clear existing UI
      activitiesList.innerHTML = '';
      // reset select options (keep placeholder)
      Array.from(activitySelect.querySelectorAll('option[data-generated]')).forEach(o => o.remove());

      Object.keys(activities).forEach((name) => {
        const data = activities[name];
        const clone = template.content.cloneNode(true);

        clone.querySelector('.activity-title').textContent = name;
        clone.querySelector('.activity-desc').textContent = data.description || '';
        const scheduleEl = clone.querySelector('.activity-schedule');
        if (scheduleEl) scheduleEl.innerHTML = `<strong>Schedule:</strong> ${data.schedule || ''}`;

        const participants = Array.isArray(data.participants) ? data.participants : [];
        const countEl = clone.querySelector('.participant-count');
        const listEl = clone.querySelector('.participants-list');
        const emptyEl = clone.querySelector('.participants-empty');

        countEl.textContent = participants.length;
        listEl.innerHTML = '';

        if (participants.length === 0) {
          emptyEl.classList.remove('hidden');
        } else {
          emptyEl.classList.add('hidden');
          participants.forEach(email => {
            const li = document.createElement('li');

            const avatar = document.createElement('span');
            avatar.className = 'participant-avatar';
            avatar.textContent = initialsFromEmail(email);

            const spanEmail = document.createElement('span');
            spanEmail.className = 'participant-email';
            spanEmail.textContent = email;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'participant-remove';
            removeBtn.title = 'Remove participant';
            removeBtn.innerHTML = '✕';
            removeBtn.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              if (!confirm(`Remove ${email} from ${name}?`)) return;
              try {
                const url = `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(email)}`;
                const res = await fetch(url, { method: 'DELETE' });
                const body = await res.json();
                if (!res.ok) {
                  showMessage(body.detail || 'Could not remove participant.', 'error');
                  return;
                }
                showMessage(body.message || 'Participant removed.', 'success');
                // reload activities to update UI and counts
                await loadActivities();
              } catch (err) {
                console.error(err);
                showMessage('Network error while removing participant.', 'error');
              }
            });

            li.appendChild(avatar);
            li.appendChild(spanEmail);
            li.appendChild(removeBtn);
            listEl.appendChild(li);
          });
        }

        activitiesList.appendChild(clone);

        // add option to select
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        opt.setAttribute('data-generated', '1');
        activitySelect.appendChild(opt);
      });
    } catch (err) {
      activitiesList.innerHTML = '<p class="error">Could not load activities.</p>';
      console.error(err);
    }
  }

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const activityName = activitySelect.value;

    if (!email || !activityName) {
      showMessage('Please provide your email and choose an activity.', 'error');
      return;
    }

    try {
      const url = `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        showMessage(body.detail || 'Signup failed.', 'error');
        return;
      }
      showMessage(body.message || 'Signed up successfully!', 'success');
      // refresh activities to show new participant
      await loadActivities();
      signupForm.reset();
    } catch (err) {
      console.error(err);
      showMessage('Network error while signing up.', 'error');
    }
  });

  // initial load
  loadActivities();
});
