const SUPABASE_URL = "https://yxcbwlrwmguwcqivujxo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4Y2J3bHJ3bWd1d2NxaXZ1anhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDUzNzYsImV4cCI6MjEwNzc4MTM3Nn0.pNpTmIA34R5RkHrGuVTEm5-haFrHW_nH0IrW5LbzRFc";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const el = (id) => document.getElementById(id);

el("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const correo = el("login-correo").value.trim();
    const password = el("login-password").value.trim();
    const errorMsg = el("error-login");
    errorMsg.textContent = "";

    // Buscamos el usuario directamente en la tabla unificada "perfiles"
    const { data: perfil, error } = await db
        .from("perfiles")
        .select("*")
        .eq("correo", correo)
        .maybeSingle();

    if (error || !perfil) {
        errorMsg.textContent = "Correo o contraseña incorrectos.";
        return;
    }

    // Validamos la contraseña
    if (perfil.password !== password) {
        errorMsg.textContent = "Correo o contraseña incorrectos.";
        return;
    }

    // Guardamos la sesión activa en el navegador
    localStorage.setItem("usuario_activo", perfil.correo);
    localStorage.setItem("rol_activo", perfil.rol);

    // Redirigimos según el rol
    if (perfil.rol === "admin") {
        window.location.href = "admin/app-admin.html";
    } else {
        window.location.href = "usuario/app-usuario.html";
    }
});