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
