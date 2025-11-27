const Auth = {
    login: async (username, password) => {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('username', data.username || username);
                localStorage.setItem('userRole', data.role || 'user');
                return true;
            }
            return false;
        } catch (e) {
            console.error('Login error:', e);
            return false;
        }
    },

    logout: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        window.location.href = 'login.html';
    },

    check: () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    getToken: () => {
        return localStorage.getItem('authToken');
    },

    getUsername: () => {
        return localStorage.getItem('username') || 'Usuario';
    },

    getUserRole: () => {
        return localStorage.getItem('userRole') || 'user';
    },

    isAdmin: () => {
        return localStorage.getItem('userRole') === 'admin';
    },

    getHeaders: () => {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }
};
