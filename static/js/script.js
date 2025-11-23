document.addEventListener('DOMContentLoaded', () => {
    // State
    let tasks = [];
    let currentFilter = 'all';
    let isEditing = false;

    // Elements
    const taskGrid = document.getElementById('taskGrid');
    const modalContainer = document.getElementById('modalContainer');
    const taskForm = document.getElementById('taskForm');
    const searchInput = document.getElementById('searchInput');
    const navItems = document.querySelectorAll('.nav-item');

    // Stats Elements
    const statTotal = document.getElementById('statTotal');
    const statPending = document.getElementById('statPending');
    const statCompleted = document.getElementById('statCompleted');

    // Init
    updateDate();
    fetchTasks();
    fetchStats();

    // Event Listeners
    taskForm.addEventListener('submit', handleFormSubmit);
    searchInput.addEventListener('input', debounce((e) => fetchTasks(e.target.value), 300));

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            currentFilter = item.dataset.filter;
            renderTasks();
        });
    });

    // Functions
    function updateDate() {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', options);
    }

    async function fetchTasks(search = '') {
        try {
            const url = search ? `/api/tasks?search=${search}` : '/api/tasks';
            const response = await fetch(url);
            tasks = await response.json();
            renderTasks();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function fetchStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            animateValue(statTotal, 0, stats.total, 1000);
            animateValue(statPending, 0, stats.pending, 1000);
            animateValue(statCompleted, 0, stats.completed, 1000);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    function renderTasks() {
        taskGrid.innerHTML = '';

        const filtered = tasks.filter(task => {
            if (currentFilter === 'all') return true;
            if (currentFilter === 'todo') return task.status === 'Todo';
            if (currentFilter === 'in_progress') return task.status === 'In Progress';
            if (currentFilter === 'done') return task.status === 'Done';
            return true;
        });

        if (filtered.length === 0) {
            taskGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">
                    <i class="fa-solid fa-ghost" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                    <p>No tasks found in this view.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            card.innerHTML = `
                <div class="task-header">
                    <span class="priority-tag priority-${task.priority}">${task.priority}</span>
                    <div class="task-actions">
                        <button class="action-btn" onclick="editTask(${task.id})"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn delete" onclick="deleteTask(${task.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <h3 class="task-title">${escapeHtml(task.title)}</h3>
                <p class="task-desc">${escapeHtml(task.description || 'No description provided.')}</p>
                <div class="task-footer">
                    <div class="status-indicator status-${task.status.replace(' ', '.')}" title="${task.status}">
                        <div class="status-dot"></div>
                        <span>${task.status}</span>
                    </div>
                    <span>${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Date'}</span>
                </div>
            `;
            taskGrid.appendChild(card);
        });
    }

    // Modal Logic
    window.openModal = () => {
        isEditing = false;
        document.getElementById('modalTitle').textContent = 'New Task';
        taskForm.reset();
        modalContainer.classList.remove('hidden');
    };

    window.closeModal = () => {
        modalContainer.classList.add('hidden');
    };

    window.editTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        isEditing = true;
        document.getElementById('modalTitle').textContent = 'Edit Task';
        document.getElementById('taskId').value = task.id;
        document.getElementById('formTitle').value = task.title;
        document.getElementById('formDescription').value = task.description;
        document.getElementById('formPriority').value = task.priority;
        document.getElementById('formStatus').value = task.status;
        if (task.due_date) {
            document.getElementById('formDueDate').value = task.due_date.slice(0, 16); // Format for datetime-local
        }

        modalContainer.classList.remove('hidden');
    };

    async function handleFormSubmit(e) {
        e.preventDefault();

        const data = {
            title: document.getElementById('formTitle').value,
            description: document.getElementById('formDescription').value,
            priority: document.getElementById('formPriority').value,
            status: document.getElementById('formStatus').value,
            due_date: document.getElementById('formDueDate').value
        };

        const url = isEditing
            ? `/api/tasks/${document.getElementById('taskId').value}`
            : '/api/tasks';

        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                closeModal();
                fetchTasks();
                fetchStats();
            }
        } catch (error) {
            console.error('Error saving task:', error);
        }
    }

    window.deleteTask = async (id) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            fetchTasks();
            fetchStats();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    // Utils
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
});
