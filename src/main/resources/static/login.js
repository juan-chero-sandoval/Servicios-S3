"use strict";
const form=document.querySelector('#login-form'), error=document.querySelector('#login-error');
form.addEventListener('submit',async event=>{
  event.preventDefault(); const button=form.querySelector('button');button.disabled=true;error.hidden=true;
  try {
    const csrfResponse=await fetch('/api/csrf'); if(!csrfResponse.ok) throw Error('No se pudo iniciar la sesión.');
    const csrf=await csrfResponse.json(), data=new URLSearchParams(new FormData(form));
    data.set(csrf.parameterName,csrf.token);
    const response=await fetch('/login',{method:'POST',body:data});
    if(!response.ok) throw Error(response.status===401?'Usuario o contraseña incorrectos.':'No se pudo ingresar. Intenta nuevamente.');
    location.replace('/');
  } catch(e) {error.textContent=e.message;error.hidden=false;} finally {button.disabled=false;}
});
