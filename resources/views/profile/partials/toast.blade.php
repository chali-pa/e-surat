<!-- Toast Notification (reusable) -->
<div id="toastContainer" class="fixed top-5 right-5 z-[300] flex flex-col gap-3 items-end pointer-events-none"></div>

<style>
    @keyframes toastIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
    .toast-item { animation: toastIn 250ms ease; font-family: 'Poppins', sans-serif; }
</style>

<script>
    // Menampilkan notifikasi toast. type: 'success' | 'error'
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container || !message) return;

        const styles = {
            success: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', icon: 'bi-check-circle-fill' },
            error:   { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: 'bi-x-circle-fill' }
        };
        const s = styles[type] || styles.success;

        const toast = document.createElement('div');
        toast.className = 'toast-item pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-xl shadow-lg border';
        toast.style.background = s.bg;
        toast.style.borderColor = s.border;
        toast.style.color = s.text;
        toast.style.minWidth = '280px';
        toast.style.maxWidth = '380px';
        toast.innerHTML = `<i class="bi ${s.icon} text-xl mt-0.5"></i><span class="text-sm font-medium flex-1">${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 300ms ease, transform 300ms ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(24px)';
            setTimeout(() => toast.remove(), 300);
        }, 4500);
    }
</script>
