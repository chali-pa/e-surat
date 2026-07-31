<script>
    // Disable right-click context menu
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    // Disable shortcut keys (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U)
    document.addEventListener('keydown', function (e) {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+J
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
            e.preventDefault();
            return false;
        }
        // Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
        // Ctrl+S
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }
    });

    // Prevent dragging elements
    document.addEventListener('dragstart', function (e) {
        e.preventDefault();
    });

    // Infinite debugger to make inspection extremely annoying
    setInterval(function() {
        (function() {
            try {
                (function a(i) {
                    if (("" + i / i).length !== 1 || i % 20 === 0) {
                        (function() {}).constructor("debugger")();
                    } else {
                        debugger;
                    }
                    a(++i);
                })(0);
            } catch (e) {}
        })();
    }, 1000);
</script>
