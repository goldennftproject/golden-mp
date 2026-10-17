'use strict';
// Los tests históricos siguen validando la función conservada, explícitamente activada.
// La configuración de producción pausada y el inicio v4 se prueban por separado.
exports.activar=ctx=>{
  ctx.GF.PESCA_ACTIVA=true;
  if(ctx.G)ctx.G.espacioV=3;
  ctx.GF.configurarEspacio(3);
  ctx.GF.ocupCambio();
};
