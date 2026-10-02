import React, { useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { Upload, ImageIcon, Loader2 } from 'lucide-react';
import { db } from '../services/db';

interface ClassImageUploaderProps {
  classId: string;
  currentImageUrl: string | null;
  onSuccess: (newUrl: string) => void;
}

export const ClassImageUploader: React.FC<ClassImageUploaderProps> = ({
  classId,
  currentImageUrl,
  onSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setErrorMsg(null);
    
    // Validate File Type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }
    
    // Validate Size (5 MB = 5 * 1024 * 1024 bytes)
    if (file.size > 5242880) {
      setErrorMsg('A imagem é muito grande. Máximo de 5 MB.');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // 1. Upload to Storage
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `classes/${classId}/modelo.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('class-images')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });
        
      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);
      
      // 2. Get Public URL
      const { data: urlData } = supabase.storage
        .from('class-images')
        .getPublicUrl(filePath);
        
      const publicUrl = urlData.publicUrl;
      
      // 3. Update Real Supabase Database & Memory using the single source of truth
      await db.updateClass(classId, { image_url: publicUrl });
      
      // Notify parent to refresh
      onSuccess(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err.message || 'Erro inesperado no upload.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="mt-3">
      <div 
        className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden ${
          isDragging ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-300 bg-white'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          className="hidden" 
          accept="image/jpeg,image/png,image/webp" 
        />
        
        {isUploading && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
            <Loader2 className="w-6 h-6 text-sky-600 animate-spin mb-1" />
            <span className="text-xs font-bold text-sky-700">Enviando imagem...</span>
          </div>
        )}

        {currentImageUrl ? (
          <div className="w-full flex flex-col items-center">
            <img 
              src={`${currentImageUrl}?t=${new Date().getTime()}`} 
              alt="Modelo" 
              className="w-full h-32 object-contain mb-2 rounded"
            />
            <span className="text-xs font-bold text-sky-600 flex items-center gap-1">
              <Upload className="w-3 h-3" /> Trocar imagem
            </span>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-2 text-slate-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-500">
              Arraste a imagem aqui ou<br />
              <span className="text-sky-600 font-bold">clique para selecionar</span>
            </p>
          </div>
        )}
      </div>
      {errorMsg && (
        <p className="text-xs font-bold text-red-500 mt-1 text-center">{errorMsg}</p>
      )}
    </div>
  );
};
