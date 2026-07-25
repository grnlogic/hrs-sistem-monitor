import { Button } from "@/components/ui/form/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import { Badge } from "@/components/ui/display/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import {
  File as FileIcon,
  Image,
  Download,
  Eye,
} from "lucide-react";

interface FilesTabProps {
  filesLoading: boolean;
  uploadedFiles: any[];
  employee: any;
  setPreviewFile: (file: any) => void;
  setPreviewUrl: (url: string | null) => void;
}

export function FilesTab({
  filesLoading,
  uploadedFiles,
  employee,
  setPreviewFile,
  setPreviewUrl,
}: FilesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Daftar Dokumen
        </CardTitle>
        <CardDescription>
          File yang sudah di-upload untuk karyawan ini
        </CardDescription>
      </CardHeader>
      <CardContent>
        {filesLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-900"></div>
            <span className="ml-2 text-zinc-600">Memuat daftar file...</span>
          </div>
        ) : uploadedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-400">
            <FileIcon className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">Belum ada file yang di-upload</p>
            <p className="text-sm">File foto profil, dokumen PKB, bukti pelanggaran, dan slip gaji akan muncul di sini</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary by category */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from(new Set(uploadedFiles.map(f => f.kategori))).map(kategori => {
                const count = uploadedFiles.filter(f => f.kategori === kategori).length;
                return (
                  <Badge key={kategori} variant="outline" className="text-sm">
                    {kategori} ({count})
                  </Badge>
                );
              })}
            </div>

            {/* File list table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nama File</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Ukuran</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadedFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      {file.tipe === 'image' ? (
                        <Image className="h-5 w-5 text-zinc-600" />
                      ) : file.tipe === 'pdf' ? (
                        <FileIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <FileIcon className="h-5 w-5 text-zinc-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {file.nama}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        file.kategori === 'Foto Profil' ? 'bg-zinc-50 text-zinc-800' :
                        file.kategori === 'PKB' ? 'bg-zinc-50 text-zinc-800' :
                        file.kategori === 'Pelanggaran' ? 'bg-zinc-50 text-red-700' :
                        file.kategori === 'Slip Gaji' ? 'bg-zinc-50 text-zinc-700' :
                        ''
                      }>
                        {file.kategori}
                      </Badge>
                    </TableCell>
                    <TableCell className="uppercase text-xs text-zinc-500">
                      {file.tipe}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">
                      {file.ukuran
                        ? file.ukuran > 1024 * 1024
                          ? `${(file.ukuran / (1024 * 1024)).toFixed(1)} MB`
                          : `${(file.ukuran / 1024).toFixed(1)} KB`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">
                      {file.tanggal
                        ? new Date(file.tanggal).toLocaleDateString('id-ID')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {file.keterangan || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(file.tipe === 'image' || file.tipe === 'pdf') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Preview"
                            onClick={() => {
                              setPreviewFile(file);
                              // Load file with auth token
                              const token = localStorage.getItem('token');
                              const baseUrl = process.env.NEXT_PUBLIC_API_URL
                                ? (process.env.NEXT_PUBLIC_API_URL.endsWith('/') ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1) : process.env.NEXT_PUBLIC_API_URL)
                                  + (!process.env.NEXT_PUBLIC_API_URL.endsWith('/api') ? '/api' : '')
                                : 'http://localhost:8084/api';
                              const fileUrl = file.kategori === 'Foto Profil'
                                ? `${baseUrl}/karyawan/${employee.id}/foto`
                                : `${baseUrl}/karyawan/${employee.id}/files/serve?path=${encodeURIComponent(file.path)}`;
                              if (token) {
                                fetch(fileUrl, {
                                  headers: { Authorization: `Bearer ${token}` },
                                })
                                  .then(res => {
                                    if (res.ok) return res.blob();
                                    throw new Error('Failed to load');
                                  })
                                  .then(blob => {
                                    const url = URL.createObjectURL(blob);
                                    setPreviewUrl(url);
                                  })
                                  .catch(() => setPreviewUrl(null));
                              }
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Download"
                          onClick={() => {
                            const token = localStorage.getItem('token');
                            const baseUrl = process.env.NEXT_PUBLIC_API_URL
                              ? (process.env.NEXT_PUBLIC_API_URL.endsWith('/') ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1) : process.env.NEXT_PUBLIC_API_URL)
                                + (!process.env.NEXT_PUBLIC_API_URL.endsWith('/api') ? '/api' : '')
                              : 'http://localhost:8084/api';
                            const fileUrl = file.kategori === 'Foto Profil'
                              ? `${baseUrl}/karyawan/${employee.id}/foto`
                              : `${baseUrl}/karyawan/${employee.id}/files/serve?path=${encodeURIComponent(file.path)}`;
                            if (token) {
                              fetch(fileUrl, {
                                headers: { Authorization: `Bearer ${token}` },
                              })
                                .then(res => {
                                  if (res.ok) return res.blob();
                                  throw new Error('Failed');
                                })
                                .then(blob => {
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = file.nama.replace(/[^a-zA-Z0-9.-]/g, '_');
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                })
                                .catch(() => alert('Gagal download file'));
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
