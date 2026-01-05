document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
            // Basic overlay support for mobile
            if (!sidebar.classList.contains('hidden') && window.innerWidth < 768) {
                 sidebar.classList.add('absolute', 'z-50', 'h-full', 'shadow-xl');
            } else {
                 sidebar.classList.remove('absolute', 'z-50', 'h-full', 'shadow-xl');
            }
        });
    }

    // Active link highlighting
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('#sidebar nav a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Simple check: if href matches current filename
        if (href === currentPath) {
            // Add active styles
            link.classList.remove('text-slate-400', 'hover:text-white');
            link.classList.add('bg-primary/20', 'text-primary');
        } else {
            // Ensure inactive styles
            link.classList.add('text-slate-400', 'hover:text-white');
            link.classList.remove('bg-primary/20', 'text-primary');
        }

        // Close sidebar on link click (mobile)
        link.addEventListener('click', () => {
            if (window.innerWidth < 768 && sidebar) {
                sidebar.classList.add('hidden');
                sidebar.classList.remove('absolute', 'z-50', 'h-full', 'shadow-xl');
            }
        });
    });
});
