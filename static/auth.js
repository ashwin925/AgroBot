// Simple client-side auth using localStorage
// Keys: 'agroai_users' -> JSON object { username: password }
// 'agroai_logged_in' -> 'true' or 'false'
// 'agroai_current_user' -> username

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem('agroai_users') || '{}');
  } catch (e) {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem('agroai_users', JSON.stringify(users));
}

// register
window.addEventListener('DOMContentLoaded', () => {
  const regBtn = document.getElementById('reg-btn');
  const loginBtn = document.getElementById('login-btn');

  if (regBtn) {
    regBtn.addEventListener('click', () => {
      const u = document.getElementById('reg-username').value.trim();
      const p = document.getElementById('reg-password').value;
      if (!u || !p) return alert('Please provide username and password.');
      const users = getUsers();
      if (users[u]) return alert('User exists. Choose another name.');
      users[u] = p;
      saveUsers(users);
      alert('Registered. You can now login.');
      window.location.href = '/login';
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const u = document.getElementById('login-username').value.trim();
      const p = document.getElementById('login-password').value;
      if (!u || !p) return alert('Please enter username and password.');
      const users = getUsers();
      if (users[u] && users[u] === p) {
        localStorage.setItem('agroai_logged_in', 'true');
        localStorage.setItem('agroai_current_user', u);
        alert('Login successful');
        window.location.href = '/';
      } else {
        alert('Invalid credentials');
      }
    });
  }
});
