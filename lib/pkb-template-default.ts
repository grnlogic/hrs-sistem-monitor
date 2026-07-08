import type { Descendant } from "slate";
import { NAMA_PT } from "@/lib/constants/perusahaan";

export const DEFAULT_PKB_TEMPLATE_NODES: Descendant[] = [
  {
    type: "paragraph",
    align: "center",
    children: [{ text: "{{LOGO_IMAGE}}" }],
  },
  {
    type: "heading",
    align: "center",
    children: [{ text: "{{PERUSAHAAN_NAMA}}" }],
  },
  {
    type: "paragraph",
    align: "center",
    children: [{ text: "{{PERUSAHAAN_ALAMAT}}" }],
  },
  {
    type: "paragraph",
    align: "center",
    children: [{ text: "{{PERUSAHAAN_TELP}}" }],
  },
  { type: "divider", children: [{ text: "" }] },
  {
    type: "heading",
    align: "center",
    children: [{ text: "PERJANJIAN KERJA BERSAMA" }],
  },
  { type: "paragraph", children: [{ text: "Nama: {{PIHAK_1_NAMA}}" }] },
  { type: "paragraph", children: [{ text: "NIK: {{PIHAK_1_NIK}}" }] },
  { type: "paragraph", children: [{ text: "Jabatan: {{PIHAK_1_JABATAN}}" }] },
  { type: "paragraph", children: [{ text: "Selanjutnya disebut Pihak I" }] },
  { type: "paragraph", children: [{ text: "" }] },
  { type: "paragraph", children: [{ text: "Nama: {{PIHAK_2_NAMA}}" }] },
  { type: "paragraph", children: [{ text: "NIK: {{PIHAK_2_NIK}}" }] },
  { type: "paragraph", children: [{ text: "Divisi: {{PIHAK_2_JABATAN}}" }] },
  { type: "paragraph", children: [{ text: "Role: {{PERAN_KARYAWAN}}" }] },
  { type: "paragraph", children: [{ text: "Nominal Upah Pokok: {{NOMINAL_UPAH}}" }] },
  { type: "paragraph", children: [{ text: "BPJS: {{bpjs}}" }] },
  { type: "paragraph", children: [{ text: "Potongan BPJS/Bulan: {{nominal_potongan_bpjs}}" }] },
  { type: "paragraph", children: [{ text: "Alamat: {{PIHAK_2_ALAMAT}}" }] },
  { type: "paragraph", children: [{ text: "Selanjutnya disebut Pihak II" }] },
  { type: "paragraph", children: [{ text: "Telah bersepakat:" }] },
  {
    type: "numbered-list",
    children: [
      {
        type: "list-item",
        children: [
          {
            type: "paragraph",
            children: [
              {
                text: `Bahwa Pihak II menerima pekerjaan sebagai karyawan ${NAMA_PT.PJP} yang dikelola Pihak I.`,
              },
            ],
          },
        ],
      },
      {
        type: "list-item",
        children: [
          {
            type: "paragraph",
            children: [{ text: "{{PASAL_2}}" }],
          },
        ],
      },
      {
        type: "list-item",
        children: [
          {
            type: "paragraph",
            children: [{ text: "{{PASAL_3}}" }],
          },
        ],
      },
      {
        type: "list-item",
        children: [
          {
            type: "paragraph",
            children: [{ text: `Pihak II bersedia mematuhi Peraturan Perusahaan ${NAMA_PT.PJP}.` }],
          },
        ],
      },
      {
        type: "list-item",
        children: [
          {
            type: "paragraph",
            children: [{ text: "Segala bentuk permasalahan akan diselesaikan secara kekeluargaan dan sesuai dengan peraturan." }],
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [{ text: "" }],
  },
  {
    type: "paragraph",
    children: [
      {
        text: "Demikian perjanjian kerja bersama ini kami buat dengan sebenarnya tanpa ada paksaan dari pihak manapun. Terhitung sejak perjanjian kerjasama ini dibuat.",
      },
    ],
  },
  {
    type: "paragraph",
    align: "right",
    children: [{ text: "Banjar, {{TANGGAL_PERJANJIAN}}" }],
  },
  {
    type: "signature-container",
    width: 100,
    containerAlign: "center",
    children: [
      {
        type: "signature-box",
        children: [
          {
            type: "paragraph",
            align: "center",
            children: [{ text: "Pihak I" }],
          },
          {
            type: "paragraph",
            align: "center",
            children: [{ text: "" }],
          },
          {
            type: "paragraph",
            align: "center",
            children: [{ text: "{{PIHAK_1_TTD}}" }],
          },
        ],
      },
      {
        type: "signature-box",
        children: [
          {
            type: "paragraph",
            align: "center",
            children: [{ text: "Pihak II" }],
          },
          {
            type: "paragraph",
            align: "center",
            children: [{ text: "" }],
          },
          {
            type: "paragraph",
            align: "center",
            children: [{ text: "{{PIHAK_2_TTD}}" }],
          },
        ],
      },
    ],
  },
];
