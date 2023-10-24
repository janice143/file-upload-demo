
# 文件上传：自顶向下理解FormData 文件上传的工作原理

文件上传是我们在业务中经常遇到的实战场景。本文从自顶向下的角度讲解文件上传的原理。

## 表现层

我们简单写一个”上传文件demo“，来开始学习”文件上传“的知识点。

通过下面这个命令构建一个基本的nextjs应用。

```jsx
npx create-next-app@latest
```

之后通过`npm install antd`安装`antd`组件库，因为我们会使用它的upload组件。

安装好后，修改pages.tsx文件，代码如下：

```jsx
'use client';

import { Button, Upload, UploadProps, message } from 'antd';
import { FILE_PATH } from './constants';
import styles from './page.module.css';

export default function Home() {
  const props: UploadProps = {
    name: 'file',
    action: '/api/upload',
    onChange(info) {
      if (info.file.status !== 'uploading') {
        console.log(info.file, info.fileList);
      }
      if (info.file.status === 'done') {
        message.success(
          `${info.file.name} 文件上传成功, 前往 ${FILE_PATH} 查看上传文件`
        );
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    }
  };

  return (
    <main className={styles.main}>
      <div>文件上传demo</div>
      <Upload {...props}>
        <Button>上传文件</Button>
      </Upload>
    </main>
  );
}
```

写法其实和react差不多，唯一不同的是在文件顶部，我们写了`'use client';` 来声明这个文件是一个[客户端组件](https://nextjs.org/docs/app/building-your-application/rendering/client-components)。

写好了客户端部分的代码，接下来我们开始写服务端的`/api/upload`接口，nextjs是一个全栈应用框架，通过[route handler](https://nextjs.org/docs/app/api-reference/file-conventions/route)，我们可以快速写一个rest风格的接口。

我们在app文件夹下，新建一个upload文件夹，在upload文件夹中，我们新建一个route.ts文件，该文件的代码如下：

```jsx
import { FILE_PATH } from '@/app/constants';
import { writeFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return NextResponse.json({ message: '请上传文一个件', code: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const path = join(FILE_PATH, file.name);
  await writeFile(path, buffer);
  console.log(`open ${path} to see the uploaded file`);

  return NextResponse.json({ data: null, message: 'success', code: 200 });
}
```

通过运行`npm run dev` 命令，我们运行该项目。界面如下：

<image src="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/682340e601aa4341a0445b6a235af293~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=2000&h=929&s=168384&e=png&b=e9ecec"></image>

点击上传文件，选择一个文件，可以看到文件成功上传了，打开dev tool查看接口详情。我们可以看到一个在预期之内的upload请求，请求头的content-type如下：

```jsx
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryiI4jCWvT8XkA2pgg
```

请求参数：

```jsx
Form Data
file: (binary)
```

以上是一个基本的上传文件实践。在这个过程中，我们观察到了antd的upload组件在调upload接口的时候，会将请求的content-type转化成`multipart/form-data`, 并且文件数据以form data的数据结构传递给服务器，服务器为了解析文件类型与类型，也以formdata对应的解析形式进行解析（在nextjs中，我们使用nextjs 内置的request.formData来解析表单数据）。

我们的demo代码已经放到github仓库中：<https://github.com/janice143/file-upload-demo>

## HTTP协议：客户端和服务器传输数据的规范

文件上传的流程其实就是客户端和服务器进行数据交换的过程，而客户端与服务器通信遵循HTTP协议，包括请求和响应的格式、状态码、header字段等。

### 客户端

在文件上传的流程中，前端通过XMLHttpRequest请求，设置Content-Type这个请求头字段，并取值为`multipart/form-data`。**`Content-Type`**头部告诉服务器如何解析主体数据。例如，**`Content-Type: text/html`**表示主体数据是HTML文档，而**`Content-Type: application/json`**表示主体数据是JSON格式的数据。**`Content-Type:** multipart/form-data`在告诉服务器要用解析form data的形式解析才能获取文件。

### `multipart/form-data`

`multipart/form-data` 是一种**MIME类型，**浏览器使用MIME类型（而不是文件扩展符）来区分文件类型，通常由一个主类型（type）和一个子类型（subtype）组成，例如**`text/html`**表示HTML文档，**`image/jpeg`**表示JPEG图像。

```jsx
type/subtype
```

对于type来讲，一般有分为两种：discrete and multipart**。**discrete类型表示单文件，常见的有application, audio, image, text等。multipart表示有多个文件，一个合成文件，这些部分可以有自己的 MIME 类型。分为两种: message, multipart。虽然multipart用于处理多文件的场景，但是在文件上传的时候，不管是单文件还是多文件，我们都是用`multipart/form-data`这个类型，这是为什么呢？

因为`multipart`可以进行传输原始的二进制文件，在这之前，文件上传最早是使用`application/x-www-form-urlencoded`，这就要求客户端在上传文件之前对文件进行 URL 编码。如果文件主要是 ASCII 文本，则 URL 编码是有效的，但如果文件主要是二进制数据，则必须对每个字节进行都 URL 转义，这是非常低效的。

所以在[RFC 1867](https://www.ietf.org/rfc/rfc1867.txt)提案中，最早提出了`multipart/form-data`这一MIME来兼容文件上传的表示，它允许您在一个 HTTP 正文中发送多个文件，而无需对它们进行编码。

所以总结下来，调用上传接口的时候设置form-data请求头，是为了告诉服务器客户端要给你传输一个文件，而为什么要使用form-data这个content-type，这是http协议的一个规范，为了实现客户端和服务器之间高效的文件传输。

在dev tool中，我们的请求体其实还包含一个boundary字段，这是“边界定界符”，用来分割多个文件，这样服务器就能知道每个文件的边界。

```jsx
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryiI4jCWvT8XkA2pgg
```

我们上述的代码是使用了antd封装的upload组件，文件上传的时候本质是发送了一个异步的AJAX请求。在这种技术之前，我们最早是利用form表单来实现文件上传。

```jsx
<form method="POST" enctype="multipart/form-data">
  <input type="file" name="file" value="请选择文件"><br />
  <input type="submit">
</form>
```

可见，在form表单中，我们需要手动将表单数据编码格式设置为 `multipart/form-data` 类型，这个类型也是同样遵守http协议的规范。

为什么`XMLHttpRequest`无需手动设置这个请求头类型呢？

因为使用了浏览器提供的FormData构造函数。FormData对象是用于存储键值对的数据结构，是为了保存表单数据而设计的。formData的特殊用途在于进行网络请求（如`fetch`, `XMLHttpRequest`)，网络请求可以接受formData对象，并将其编码并用 `Content-Type: multipart/form-data` 发送给服务器。

所以在dev tool中，我们可以看到请求参数是form data, 其key为file, value是一个二进制文件。

<image src="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5462b72181f04a47875228caf7d5062d~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=2000&h=375&s=162827&e=png&b=fafafa"></image>

### 服务器端

在服务器端，主要是接受和处理客户端发送的文件数据。

1. **接收请求：** 服务器接收来自客户端的HTTP POST请求，请求头部中包括**`Content-Type`**为**`multipart/form-data`**的标识。
2. **解析数据：** 服务器使用**`multipart/form-data`**格式解析请求体中的数据。这个格式将数据划分为多部分，每个部分包含一个表单字段或一个文件。
3. **处理文件：** 对于文件部分，服务器会将其保存到指定的位置，通常是文件系统中的某个目录。文件名和路径通常是根据服务器端的需求和配置而定。
4. **返回响应：** 服务器处理完文件后，会向客户端发送响应，通常包括状态码（如200表示成功）和一些附加信息。

服务器端的文件上传流程可以根据具体的后端框架和语言而有所不同，但基本原理是相似的。通常，服务器端会提供文件处理的API或路由，以接收和处理上传的文件。

## 非Form Data形式上传的文件

客户端和服务器之间上传文件并不限于使用FormData格式。FormData是一种常用的方法，但还有其他方式可以进行文件上传。

例如可以将文件内容转换为Base64编码，然后将其作为文本数据上传。服务器端可以将Base64解码为原始文件。

如果后端需要的数据是其他形式的二进制文件，如果blob, array buffer，客户端可以通过浏览器提供的Blob和File实例格式化数据，服务器为了能够识别这些二进制文件，可以才有适配的方法，例如使用Node.js（Express）接收Blob文件，可以使用中间件来处理文件上传。以下是一个基本示例：

```jsx

const express = require('express');
const app = express();
const multer = require('multer');

// 配置文件上传
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 处理文件上传
app.post('/upload', upload.single('file'), (req, res) => {
  const blobData = req.file.buffer; // Blob数据可以在req.file.buffer中找到
  // 在这里对blobData进行处理，保存到磁盘或数据库
  res.status(200).json({ message: 'File uploaded successfully' });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

在这个示例中，**`multer`**中间件用于处理文件上传，**`req.file.buffer`**包含了Blob数据。

客户端和服务器进行文件传输的其他常见方式还有一种是**基于WebSocket的文件上传**，WebSocket协议允许双向通信，因此可以使用WebSocket来实现实时文件上传和流传输。

## 总结

本文主要介绍了基于form data形式的文件上传原理。从一个实例出发，解释了multipart/form-data类型的文件传输协议，通过解释MIME type规范的意义，我们进一步延伸了非form data类型的文件上传。总之，文件上传本质上就是一个浏览器和服务器通信的问题，最重要的是把握的是二者之间需要遵守什么规范，才能保证客户端正确地发送文件，服务器正确地接受文件。

## 如何使用本项目

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!
