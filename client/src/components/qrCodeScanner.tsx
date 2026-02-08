import { CameraOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { QrScanner } from "@yudiel/react-qr-scanner";
import { Modal, Space } from "antd";
import React, { useState } from "react";
import { useNavigate } from "react-router";

interface QRCodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const QRCodeScannerDialogModal: React.FC<QRCodeScannerModalProps> = ({ visible, onClose }) => {
  const [lastError, setLastError] = useState<string | null>(null);
  const t = useTranslate();
  const navigate = useNavigate();

  const onScan = (result: string) => {
    // Check for the spoolman ID format
    const match = result.match(/^web\+spoolman:s-(?<id>[0-9]+)$/);
    if (match && match.groups) {
      onClose();
      navigate(`/spool/show/${match.groups.id}`);
    }
    const fullURLmatch = result.match(/^https?:\/\/[^\/]+\/spool\/show\/(?<id>[0-9]+)$/);
    if (fullURLmatch && fullURLmatch.groups) {
      onClose();
      navigate(`/spool/show/${fullURLmatch.groups.id}`);
    }
  };

  return (
    <Modal 
      open={visible} 
      destroyOnClose 
      onCancel={onClose} 
      footer={null} 
      title={t("scanner.title")}
      width="90%"
      style={{ maxWidth: 500 }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <p>{t("scanner.description")}</p>
        <QrScanner
          constraints={{
            facingMode: "environment",
          }}
          viewFinder={
            lastError
              ? () => (
                  <div
                    style={{
                      position: "absolute",
                      textAlign: "center",
                      width: "100%",
                      top: "50%",
                    }}
                  >
                    <p>{lastError}</p>
                  </div>
                )
              : undefined
          }
          onDecode={onScan}
          onError={(error: Error) => {
            console.error(error);
            if (error.name === "NotAllowedError") {
              setLastError(t("scanner.error.notAllowed"));
            } else if (
              error.name === "InsecureContextError" ||
              (location.protocol !== "https:" && navigator.mediaDevices === undefined)
            ) {
              setLastError(t("scanner.error.insecureContext"));
            } else if (error.name === "StreamApiNotSupportedError") {
              setLastError(t("scanner.error.streamApiNotSupported"));
            } else if (error.name === "NotReadableError") {
              setLastError(t("scanner.error.notReadable"));
            } else if (error.name === "NotFoundError") {
              setLastError(t("scanner.error.notFound"));
            } else {
              setLastError(t("scanner.error.unknown", { error: error.name }));
            }
          }}
        />
      </Space>
    </Modal>
  );
};

const QRCodeScannerModal: React.FC = () => {
  return <></>;
};

export default QRCodeScannerModal;
