# Guía de Implementación de Referencias Cruzadas

Las referencias cruzadas de realizan de la siguiente manera:

- **indicadores**: cada título de sección o subsección cuenta con un indicador declarado entre llaves, sin espacios, y comenzando con el símbolo de número (e.j. {#indicador-de-la-seccion})
- **vínculos**: en el cuerpo, para establecer una referencia cruzada se pone entre corchetes el formato y seguido entre paréntesis el indicador al que hace referencia (e.j. [Paragraph Number & Page Number](#indicador-de-seccion) )

Los siguientes formatos de referencia cruzada están disponibles, y así se verán en el documento final (supongamos que la sección destino corresponde al apartado 3.1 y está en la página 43):

- **Paragraph Number & Page Number**  
  Sintaxis: `[Paragraph Number & Page Number](#id-seccion)`  
  Resultado: `3.1 en pág. 43`  
  Ejemplo de uso:  
  > "...como se expuso detalladamente en [Paragraph Number & Page Number](#evolucion-del-ballet)"  
  → Renderiza como: "...como se expuso detalladamente en 3.1 en pág. 43"

- **Enclosed Paragraph Number & Page Number**  
  Sintaxis: `[Enclosed Paragraph Number & Page Number](#id-seccion)`  
  Resultado: `(3.1 en pág. 43)`  
  Ejemplo de uso:  
  > "...siguiendo la argumentación previa [Enclosed Paragraph Number & Page Number](#analisis-sintetico)"  
  → Renderiza como: "...siguiendo la argumentación previa (3.1 en pág. 43)"

- **Page Number**  
  Sintaxis: `[Page Number](#id-seccion)`  
  Resultado: `pág. 43`  
  Ejemplo de uso:  
  > "...véase la definición en [Page Number](#marco-conceptual)"  
  → Renderiza como: "...véase la definición en pág. 43"

- **Enclosed Page Number**  
  Sintaxis: `[Enclosed Page Number](#id-seccion)`  
  Resultado: `(pág. 43)`  
  Ejemplo de uso:  
  > "...como se detalla [Enclosed Page Number](#teoria-del-esfuerzo)"  
  → Renderiza como: "...como se detalla (pág. 43)"

**Resumen visual de ejemplos concretos:**

- "...las conclusiones metodológicas ya exploradas [Paragraph Number & Page Number](#conclusiones-metodologicas)"
  → "...las conclusiones metodológicas ya exploradas 3.1 en pág. 43"
- "...ver el desarrollo completo [Enclosed Paragraph Number & Page Number](#desarrollo-completo)"
  → "...ver el desarrollo completo (3.1 en pág. 43)"
- "...véase también [Page Number](#referencia-secundaria)"
  → "...véase también pág. 43"
- "...como ampliado [Enclosed Page Number](#apartado-anexo)"
  → "...como ampliado (pág. 43)"
