export const DRAWING_GUIDE = `# Como desenhar no CrafyTask (write_drawing)

O desenho é uma cena do Excalidraw. Você envia elementos simplificados em "elements"; o app completa os campos, liga as setas e gera a imagem. Depois de gravar, chame read_drawing para ver o resultado e corrigir.

## Regras gerais
- Todo elemento tem type, x e y (canto superior esquerdo, em pixels; y cresce para baixo).
- Dê um id curto e único a todo elemento que uma seta vai ligar.
- Deixe pelo menos 60 px livres entre caixas; setas e rótulos precisam de espaço.
- Caixa de texto de uma linha: width de 160 a 240, height de 60 a 80. Texto longo pede caixa maior.
- Monte em grade: colunas a cada 280 px, linhas a cada 140 px.
- Até 500 elementos por chamada.

## Formas: rectangle, ellipse, diamond
{ "type": "rectangle", "id": "api", "x": 0, "y": 0, "width": 200, "height": 70, "label": { "text": "API" } }
Opcionais: backgroundColor, strokeColor (hex), fillStyle ("solid", "hachure", "cross-hatch"), strokeStyle ("solid", "dashed", "dotted"), strokeWidth (1, 2, 4), roundness ({ "type": 3 } arredonda o retângulo). O label aceita text, fontSize, strokeColor.
Use diamond para decisão e ellipse para início e fim.

## Texto solto
{ "type": "text", "x": 0, "y": -60, "text": "Fluxo de login", "fontSize": 28 }

## Setas e linhas: arrow, line
{ "type": "arrow", "x": 200, "y": 35, "start": { "id": "api" }, "end": { "id": "db" }, "label": { "text": "consulta" } }
- start e end com id prendem a seta às formas: ela acompanha as caixas e o app calcula o traçado.
- Sem start e end, use width e height como deslocamento a partir de x, y (width 200, height 0 = seta horizontal para a direita).
- Opcionais: strokeStyle, strokeColor, startArrowhead e endArrowhead ("arrow", "triangle", "dot", "bar" ou null).

## Moldura: frame
{ "type": "frame", "name": "Backend", "children": ["api", "db"] }
Agrupa visualmente os elementos listados em children.

## Cores que funcionam nos dois temas
Traço: "#1e1e1e" (padrão), "#1971c2" azul, "#2f9e44" verde, "#e03131" vermelho, "#f08c00" laranja.
Fundo: "#a5d8ff" azul, "#b2f2bb" verde, "#ffc9c9" vermelho, "#ffec99" amarelo, "#e9ecef" cinza. Com fundo, use fillStyle "solid".

## Modos
- mode=append (padrão) acrescenta ao desenho que já existe: posicione longe do que já está lá (read_drawing mostra).
- mode=replace troca o desenho inteiro; sobre um desenho existente exige confirm_token.

## Exemplo: três caixas ligadas
[
  { "type": "ellipse", "id": "inicio", "x": 0, "y": 0, "width": 160, "height": 70, "label": { "text": "Pedido" } },
  { "type": "rectangle", "id": "valida", "x": 280, "y": 0, "width": 200, "height": 70, "backgroundColor": "#a5d8ff", "fillStyle": "solid", "label": { "text": "Validar" } },
  { "type": "diamond", "id": "ok", "x": 580, "y": -15, "width": 160, "height": 100, "label": { "text": "Válido?" } },
  { "type": "arrow", "x": 160, "y": 35, "start": { "id": "inicio" }, "end": { "id": "valida" } },
  { "type": "arrow", "x": 480, "y": 35, "start": { "id": "valida" }, "end": { "id": "ok" } }
]`
