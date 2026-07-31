<!-- Toast Notification (reusable) -->
<div id="toastContainer" class="fixed top-5 right-5 z-[300] flex flex-col gap-3 items-end pointer-events-none"></div>

<style>
    @keyframes toastIn { 
        from { opacity: 0; transform: translateX(40px) scale(0.95); } 
        to { opacity: 1; transform: translateX(0) scale(1); } 
    }
    @keyframes toastOut { 
        from { opacity: 1; transform: translateX(0) scale(1); } 
        to { opacity: 0; transform: translateX(40px) scale(0.95); } 
    }
    .toast-item { 
        animation: toastIn 350ms cubic-bezier(0.16, 1, 0.3, 1); 
        font-family: 'Poppins', sans-serif;
        backdrop-filter: blur(10px);
    }
    .toast-item.hiding {
        animation: toastOut 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
</style>

<script>
    // Menampilkan notifikasi toast. type: 'success' | 'error'
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container || !message) return;

        const styles = {
            success: { 
                bg: 'linear-gradient(135deg, rgba(236, 253, 245, 0.95) 0%, rgba(167, 243, 208, 0.9) 100%)', 
                border: '#34D399', 
                text: '#065F46', 
                icon: 'bi-check-circle-fill',
                iconBg: 'rgba(16, 185, 129, 0.15)',
                iconColor: '#059669'
            },
            error:   { 
                bg: 'linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(254, 202, 202, 0.9) 100%)', 
                border: '#F87171', 
                text: '#991B1B', 
                icon: 'bi-x-circle-fill',
                iconBg: 'rgba(239, 68, 68, 0.15)',
                iconColor: '#DC2626'
            }
        };
        const s = styles[type] || styles.success;

        const toast = document.createElement('div');
        toast.className = 'toast-item pointer-events-auto flex items-start gap-4 px-6 py-4 rounded-2xl shadow-2xl border';
        toast.style.background = s.bg;
        toast.style.borderColor = s.border;
        toast.style.color = s.text;
        toast.style.minWidth = '320px';
        toast.style.maxWidth = '420px';
        toast.style.borderWidth = '1.5px';
        
        toast.innerHTML = `
            <div style="
                width: 40px;
                height: 40px;
                border-radius: 12px;
                background: ${s.iconBg};
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            ">
                <i class="bi ${s.icon} text-xl" style="color: ${s.iconColor}"></i>
            </div>
            <div class="flex-1">
                <span class="text-sm font-semibold leading-relaxed">${message}</span>
            </div>
            <button onclick="this.closest('.toast-item').classList.add('hiding'); setTimeout(() => this.closest('.toast-item').remove(), 300)" 
                    style="
                        background: transparent;
                        border: none;
                        color: ${s.text};
                        opacity: 0.6;
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 8px;
                        transition: all 0.2s;
                        flex-shrink: 0;
                    ">
                <i class="bi bi-x-lg"></i>
            </button>
        `;

        // Add hover effect for close button
        const closeBtn = toast.querySelector('button');
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.opacity = '1';
            closeBtn.style.background = 'rgba(0,0,0,0.05)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.opacity = '0.6';
            closeBtn.style.background = 'transparent';
        });

        container.appendChild(toast);

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('hiding');
                setTimeout(() => {
                    if (toast.parentNode) toast.remove();
                }, 300);
            }
        }, 5000);
    }
</script>
