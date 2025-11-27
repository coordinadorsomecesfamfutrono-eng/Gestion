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

    getHeaders: () => {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }
};
