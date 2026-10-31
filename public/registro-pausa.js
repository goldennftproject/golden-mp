/* Registro sin arranque de Phaser ni entrada a la granja durante la pausa. */
(async function(){
 const form=document.getElementById('registro'),button=document.getElementById('registrar'),message=document.getElementById('estado');
 if(!window.supabase?.createClient||!window.GOLDEN_REGISTRO){button.disabled=true;message.textContent='No se pudo conectar con el registro. Recarga la página para intentarlo de nuevo.';return;}
 const {url,key}=window.GOLDEN_REGISTRO;
 const sb=window.supabase.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:true,storageKey:'gf-registro-pausa'}});
 try{const {data}=await sb.auth.getSession();if(data?.session){const confirmed=await sb.auth.getUser();await sb.auth.signOut({scope:'local'});if(!confirmed.error)message.textContent='Correo confirmado. Tu cuenta está registrada; el acceso al juego sigue cerrado hasta la nueva apertura.';} }catch{message.textContent='El acceso al juego sigue cerrado. Si el enlace del correo ha caducado, puedes solicitar otro registro.';}
 if(location.hash||location.search)history.replaceState(null,'',location.pathname);
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(button.disabled||!form.reportValidity())return;
  button.disabled=true;message.textContent='Enviando confirmación…';
  try{const {error}=await sb.auth.signInWithOtp({email:document.getElementById('email').value.trim(),options:{shouldCreateUser:true,data:{nick:document.getElementById('nick').value.trim().slice(0,14)},emailRedirectTo:location.origin+'/'}});
   if(error)throw error;
   message.textContent='Revisa tu correo y confirma el registro. Mira también en spam. Confirmar el correo no abre el juego; anunciaremos la nueva apertura en Discord.';
  }catch(err){message.textContent=err?.status===429?'Espera unos minutos antes de volver a solicitar el correo.':'No se pudo enviar la confirmación. Inténtalo de nuevo en unos minutos.';}
  finally{button.disabled=false;}
 });
})();
