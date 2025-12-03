export const streamContent = `
<thinking>这是一段自定义解析处理的thinking组件</thinking>
>>>I'll create a simple Electron + Vue chat application demo. Here's the structure:

[Star on GitHub](https://github.com/Simon-He95/markstream-vue)

<a href="https://simonhe.me/">我是 a 元素标签</a>

https://github.com/Simon-He95/markstream-vue

[【Author: Simon】](https://simonhe.me/)

- **[Link (Test 1)](https://simonhe.me/)**

**[Link (Test 2)](https://simonhe.me/)**

**Markdown链接**：  
1. [GitHub官网](https://github.com)  
2. [知乎 - 有问题就会有答案](https://www.zhihu.com)  
3. **加粗链接**：[Google](https://www.google.com)  
4. 嵌套格式的链接：[*斜体链接*](https://example.com)  

**普通链接**：  
1. https://www.wikipedia.org  
2. http://example.com/path?query=test  
3. 纯文本URL：https://markdown-guide.readthedocs.io

![Vue Markdown Icon](/vue-markdown-icon.svg "Vue Markdown Icon")
*Figure: Vue Markdown Icon (served from /vue-markdown-icon.svg)*

这是 ~~已删除的文本~~，这是一个表情 :smile:。

- [ ] Star this repo
- [x] Fork this repo
- [ ] Create issues
- [x] Submit PRs

##  表格

| 姓名 | 年龄 | 职业 |
|------|------|------|
| 张三 | 25   | 工程师 |
| 李四 | 30   | 设计师 |
| 王五 | 28   | 产品经理 |

### 对齐表格
| 左对齐 | 居中对齐 | 右对齐 |
|:-------|:--------:|-------:|
| 内容1  |  内容2   |  内容3 |
| 内容4  |  内容5   |  内容6 |

我将为您输出泰勒公式的一般形式及其常见展开式。

---

## 0. 薛定谔方程（量子力学）
$$i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r},t) = \\left[ -\\frac{\\hbar^2}{2m} \\nabla^2 + V(\\mathbf{r},t) \\right] \\Psi(\\mathbf{r},t)$$


## 1. 泰勒公式（Taylor's Formula）

### 一般形式（在点 \\(x = a\\) 处展开）：
\[
f(x) = f(a) + f'(a)(x-a) + \frac{f''(a)}{2!}(x-a)^2 + \frac{f'''(a)}{3!}(x-a)^3 + \cdots + \frac{f^{(n)}(a)}{n!}(x-a)^n + R_n(x)
\\]

其中：
- \\(f^{(k)}(a)\\) 是 \\(f(x)\\) 在 \\(x=a\\\) 处的 \\(k\\) 阶导数
- \\(R_n(x)\\) 是余项，常见形式有拉格朗日余项：
\[
R_n(x) = \frac{f^{(n+1)}(xi)}{(n+1)!}(x-a)^{n+1}, \quad xi \text{ 在 } a \text{ 和 } x \text{ 之间}
\\]

---

## 2. 麦克劳林公式（Maclaurin's Formula，即 \\(a=0\\) 时的泰勒公式）：
\[
f(x) = f(0) + f'(0)x + \frac{f''(0)}{2!}x^2 + \frac{f'''(0)}{3!}x^3 + \cdots + \frac{f^{(n)}(0)}{n!}x^n + R_n(x)
\\]

---

## 3. 常见函数的麦克劳林展开（前几项）

- **指数函数**：
\\[
e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots + \frac{x^n}{n!} + \cdots, \quad x \in \mathbb{R}
\\]

- **正弦函数**：
\\[
\sin x = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \frac{x^7}{7!} + \cdots + (-1)^n \frac{x^{2n+1}}{(2n+1)!} + \cdots
\\]

- **余弦函数**：
\\[
\cos x = 1 - \frac{x^2}{2!} + \frac{x^4}{4!} - \frac{x^6}{6!} + \cdots + (-1)^n \frac{x^{2n}}{(2n)!} + \cdots
\\]

- **自然对数**（在 \\(x=0\\) 附近）：
\\[
\ln(1+x) = x - \frac{x^2}{2} + \frac{x^3}{3} - \frac{x^4}{4} + \cdots + (-1)^{n-1} \frac{x^n}{n} + \cdots, \quad -1 < x \le 1
\\]

- **二项式展开**（\\( (1+x)^m \\)，\\(m\\) 为实数）：
\[
(1+x)^m = 1 + mx + \frac{m(m-1)}{2!}x^2 + \frac{m(m-1)(m-2)}{3!}x^3 + \cdots, \quad |x| < 1
\\]

- **矩阵**：
\\[
\begin{bmatrix}
2x_2 - 8x_3 = 8 \\
5x_1 - 5x_3 = 10
\end{bmatrix}
\\]

- **公式**


- **代入数据**
   \\[
   \frac{363}{15,\!135} \times 100\% = 2.398\%
   \\]

- **计算工具验证**
   通过数学计算工具确认结果：
   \`363 ÷ 15,135 × 100 = 2.39841427...\`

- **差异说明**
   $$E=mc^2$$

---

如果您需要某个特定函数在特定点的泰勒展开，请告诉我，我可以为您详细写出。

::: warning
这是一个警告块。
:::

::: tip 提示标题
这是带标题的提示。
:::

::: error 错误块
这是一个错误块。
:::

مرحبا بكم في عالم اللغة العربية!
1. First, let's set up the project:

\`\`\`shellscript
# Create Vue project
npm create vue@latest electron-vue-chat

# Navigate to project
cd electron-vue-chat

# Install dependencies
npm install
npm install electron electron-builder vue-router

# Install dev dependencies
npm install -D electron-dev-server concurrently wait-on
\`\`\`

2. Create the main Electron file:

\`\`\`javascript:electron/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const url = isDev
    ? 'http://localhost:5173'
    : \`file://\${path.join(__dirname, '../dist/index.html')}\`;

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
\`\`\`

3. Update package.json:

\`\`\`diff json:package.json
{
  "name": "markstream-vue",
  "type": "module",
- "version": "0.0.49",
+ "version": "0.0.54-beta.1",
  "packageManager": "pnpm@10.16.1",
  "description": "A Vue 3 component that renders Markdown string content as HTML, supporting custom components and advanced markdown features.",
  "author": "Simon He",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git + git@github.com:Simon-He95/markstream-vue.git"
  },
  "bugs": {
    "url": "https://github.com/Simon-He95/markstream-vue/issues"
  },
  "keywords": [
    "vue",
    "vue3",
    "markdown",
    "markdown-to-html",
    "markdown-renderer",
    "vue-markdown",
    "vue-component",
    "html",
    "renderer",
    "custom-component"
  ],
  "exports": {
    ".": {
      "types": "./dist/types/exports.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./index.css": "./dist/index.css",
    "./index.tailwind.css": "./dist/index.tailwind.css",
    "./tailwind": "./dist/tailwind.ts"
  },
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/types/exports.d.ts",
  "files": [
    "dist"
  ],
}
\`\`\`

4. Create chat components \\(diversified languages\\):

\`\`\`python:src/server/app.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Message(BaseModel):
    sender: str
    text: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/echo")
def echo(msg: Message):
    return {"reply": f"Echo: {msg.text}"}
\`\`\`

5. Create a native module example \(C++\):

\`\`\`cpp:src/native/compute.cpp
#include <bits/stdc++.h>
using namespace std;

int fibonacci(int n){
  if(n<=1) return n;
  int a=0,b=1;
  for(int i=2;i<=n;++i){ int c=a+b; a=b; b=c; }
  return b;
}

int main(){
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  cout << "fib(10)=" << fibonacci(10) << "\n";
  return 0;
}
\`\`\`

6. Update the main App.vue:

\`\`\`vue:src/App.vue
<template>
  <router-view />
<\/template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
}
</style>
\`\`\`

7. Set up the router:

\`\`\`javascript:src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import ChatView from '../views/ChatView.vue';

const routes = [
  {
    path: '/',
    name: 'chat',
    component: ChatView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
\`\`\`

8. Update main.js:

\`\`\`javascript:src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

createApp(App).use(router).mount('#app');
\`\`\`

9. Mermaid graphic:

\`\`\`mermaid
graph TD
    Kira_Yamato[基拉·大和]
    Lacus_Clyne[拉克丝·克莱因]
    Athrun_Zala[阿斯兰·萨拉]
    Cagalli_Yula_Athha[卡嘉莉·尤拉·阿斯哈]
    Shinn_Asuka[真·飞鸟]
    Lunamaria_Hawke[露娜玛丽亚·霍克]
    COMPASS[世界和平监视组织COMPASS]
    Foundation[芬德申王国]
    Orphee_Lam_Tao[奥尔菲·拉姆·陶]
    %% 节点定义结束，开始定义边
    Kira_Yamato ---|恋人| Lacus_Clyne
    Kira_Yamato ---|挚友| Athrun_Zala
    Kira_Yamato -->|隶属| COMPASS
    Kira_Yamato -->|前辈| Shinn_Asuka
    Lacus_Clyne -->|初代总裁| COMPASS
    Athrun_Zala ---|恋人| Cagalli_Yula_Athha
    Athrun_Zala -.->|协力| COMPASS
    Shinn_Asuka ---|恋人| Lunamaria_Hawke
    Shinn_Asuka -->|隶属| COMPASS
    Lunamaria_Hawke -->|隶属| COMPASS
    COMPASS -->|对立| Foundation
    Orphee_Lam_Tao -->|隶属| Foundation
    Orphee_Lam_Tao -.->|追求| Lacus_Clyne
\`\`\`

\`\`\`mermaid
  xychart
    title "销售收入"
    x-axis ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
    y-axis "收入" 4000 --> 11000
    line [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]
\`\`\`

---
# 复杂数学公式

### 1. **理解 \\(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\\) 的含义**
   - \\(\boldsymbol{\alpha}\\) 和 \\(\boldsymbol{\beta}\\) 是三维列向量，因此 \\(\boldsymbol{\alpha}^T \boldsymbol{\beta}\\) 表示它们的点积（内积）。
   - \\(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\\) 意味着向量 \\(\boldsymbol{\alpha}\\) 和 \\(\boldsymbol{\beta}\\) 正交（即垂直），因为点积为零表示它们之间的夹角为 90 度。

### 2. **正交补空间的概念**
   - 在线性代数中，对于一个子空间 \\(W\\)，它的正交补空间（记为 \\(W^\perp\\)）定义为所有与 \\(W\\) 中每个向量正交的向量的集合。即：
     \[
     W^\perp = \{ \mathbf{v} \in \mathbb{R}^3 \mid \mathbf{v} \cdot \mathbf{w} = 0 \text{ 对于所有 } \mathbf{w} \in W \}
     \]
   - 例如，如果 \\(W\\) 是由一个向量 \\(\boldsymbol{\alpha}\\) 张成的一维子空间（即 \\(W = \operatorname{span}\{\boldsymbol{\alpha}\}\\)），那么 \\(W^\perp\\) 就是所有与 \\(\boldsymbol{\alpha}\\) 正交的向量构成的二维平面。
### 3. **\\(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\\) 与正交补空间的联系**
   - 当 \\(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\\) 时，这意味着：
     - \\(\boldsymbol{\beta}\\) 属于 \\(\operatorname{span}\{\boldsymbol{\alpha}\}\\) 的正交补空间，即 \\(\boldsymbol{\beta} \in (\operatorname{span}\{\boldsymbol{\alpha}\})^\perp\\)。
     - 同样，\\(\boldsymbol{\alpha}\\) 也属于 \\(\operatorname{span}\{\boldsymbol{\beta}\}\\) 的正交补空间，即 \\(\boldsymbol{\alpha} \in (\operatorname{span}\{\boldsymbol{\beta}\})^\perp\\)。
   - 换句话说，\\(\boldsymbol{\beta}\\) 与 \\(\boldsymbol{\alpha}\\) 张成的直线正交，因此 \\(\boldsymbol{\beta}\\) 位于该直线的垂直平面（即正交补空间）上。反之亦然。

### 4. **在三维空间中的几何意义**
   - 在三维空间中，如果 \\(\boldsymbol{\alpha}\\) 是一个非零向量，那么 \\(\operatorname{span}\{\boldsymbol{\alpha}\}\\) 是一条通过原点的直线，而它的正交补空间 \\((\operatorname{span}\{\boldsymbol{\alpha}\})^\perp\\) 是一个通过原点且与该直线垂直的平面。
   - \\(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\\) 表示 \\(\boldsymbol{\beta}\\) 位于这个垂直平面上。同样，如果 \\(\boldsymbol{\beta}\\) 非零，那么 \\(\boldsymbol{\alpha}\\) 也位于与 \\(\boldsymbol{\beta}\\) 垂直的平面上。

### 5. **推广到更一般的情况**
   - 如果考虑多个向量，正交补空间的概念可以扩展。例如，如果有一组向量 \\(\{\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_k\}\\)，那么它们的张成子空间 \\(W = \operatorname{span}\{\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_k\}\\) 的正交补空间 \\(W^\perp\\) 包含所有与这些向量正交的向量。
   - 在这种情况下，\\(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\\) 可以看作 \\(\boldsymbol{\beta}\\) 与 \\(W\\) 正交的一个特例（当 \\(W\\) 只由 \\(\boldsymbol{\alpha}\\) 张成时）。
总之，\\(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\\) 直接体现了正交补空间的关系：它表明一个向量属于另一个向量张成子空间的正交补空间。如果你有更多向量或子空间，这种联系可以进一步深化。

**示例：** emm\`1-(5)\`、\`3-(3)\`、\`3-(4)\` complex test \`1-(4)\`“heiheihei”中，hello world。
`
