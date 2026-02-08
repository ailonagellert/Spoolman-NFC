import { CameraOutlined, DownOutlined } from "@ant-design/icons";
import type { RefineThemedLayoutV2HeaderProps } from "@refinedev/antd";
import { useGetLocale, useSetLocale, useTranslate } from "@refinedev/core";
import { Layout as AntdLayout, Button, Dropdown, MenuProps, Space, Switch, theme } from "antd";
import React, { useContext, useState } from "react";
import { ColorModeContext } from "../../contexts/color-mode";

import { languages } from "../../i18n";
import { QRCodeScannerDialogModal } from "../qrCodeScanner";

const { useToken } = theme;

export const Header: React.FC<RefineThemedLayoutV2HeaderProps> = ({ sticky }) => {
  const { token } = useToken();
  const locale = useGetLocale();
  const changeLanguage = useSetLocale();
  const { mode, setMode } = useContext(ColorModeContext);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const t = useTranslate();

  const currentLocale = locale();

  const menuItems: MenuProps["items"] = [
    {
      key: "scanner",
      label: t("scanner.title"),
      icon: <CameraOutlined />,
      onClick: () => setQrScannerOpen(true),
    },
    { type: "divider" },
    ...([...Object.keys(languages) || []].sort().map((lang: string) => ({
      key: lang,
      onClick: () => changeLanguage(lang),
      label: languages[lang].name,
    }))),
  ];

  const headerStyles: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "0px 16px",
    minHeight: "56px",
    height: "auto",
    flexWrap: "wrap",
    gap: "8px",
  };

  if (sticky) {
    headerStyles.position = "sticky";
    headerStyles.top = 0;
    headerStyles.zIndex = 1;
  }

  return (
    <>
      <AntdLayout.Header style={headerStyles}>
        <Space wrap style={{ gap: "8px" }}>
          <Dropdown
            menu={{
              items: menuItems,
              selectedKeys: currentLocale ? [currentLocale] : [],
            }}
          >
            <Button type="text" size="small">
              <Space>
                {languages[currentLocale ?? "en"].name}
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
          <Switch
            checkedChildren="🌛"
            unCheckedChildren="🔆"
            onChange={() => setMode(mode === "light" ? "dark" : "light")}
            defaultChecked={mode === "dark"}
          />
        </Space>
      </AntdLayout.Header>
      <QRCodeScannerDialogModal visible={qrScannerOpen} onClose={() => setQrScannerOpen(false)} />
    </>
  );
};
