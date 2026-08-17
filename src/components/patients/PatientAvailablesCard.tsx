"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip"; // ajuste o caminho conforme sua estrutura
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toDateString } from "../../utils/dateUtils";
import { IDoctors, IPatient } from "../../utils/types/types";
import { Button } from "../ui/Button";
import Input from "../ui/Input";
import InputCurrency from "../ui/InputCurrency";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";

interface EvaluationData {
  doctorId: string;
  valuePaid: number;
  paymentType: string;
  date: string;
  time: string;
}

interface Props {
  doctors: IDoctors[];
  evaluations: EvaluationData[];
  patientInfo: IPatient;
  evaluationToEdit?: any;
  setEvaluationToEdit: (eval: any) => void;
  onSubmit: (data: EvaluationData, id?: string) => void;
  onDelete: (id: string) => void;
}


export function PatientAvailablesCard({ doctors, evaluations, onDelete, patientInfo, evaluationToEdit, setEvaluationToEdit, onSubmit }: Props) {
  const PAGE_SIZE = 8;
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [evaluationData, setEvaluationData] = useState<EvaluationData>({
    doctorId: "",
    valuePaid: 0,
    paymentType: "",
    date: "",
    time: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEvaluationData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (evaluationToEdit?._id) {
      onSubmit(evaluationData, evaluationToEdit._id); // editar
    } else {
      onSubmit(evaluationData); // novo
    }
    setShowModal(false);
  };

  const totalEvaluations = Array.isArray(evaluations) ? evaluations.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalEvaluations / PAGE_SIZE));
  const paginatedEvaluations = Array.isArray(evaluations)
    ? evaluations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : [];

  useEffect(() => {
    setCurrentPage(1);
  }, [totalEvaluations]);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Avaliações</h3>
              <p className="mt-0.5 text-xs text-gray-500">{totalEvaluations} avaliações registradas</p>
            </div>
          </div>
          <div>
            <TooltipProvider >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => setShowModal(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Nova avaliação
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Adicionar Avaliação</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
          {Array.isArray(evaluations) && evaluations.length === 0 && (
            <div className="py-8 text-center">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Nenhuma avaliação</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Não há avaliações registradas. Clique no + acima para adicionar.
              </p>
            </div>
          )}

          {Array.isArray(evaluations) && evaluations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Profissional</th>
                    <th className="px-4 py-3 text-left font-medium">Especialidade</th>
                    <th className="px-4 py-3 text-left font-medium">Data</th>
                    <th className="px-4 py-3 text-left font-medium">Hora</th>
                    <th className="px-4 py-3 text-left font-medium">Valor Pago</th>
                    <th className="px-4 py-3 text-left font-medium">Pagamento</th>
                    <th className="px-4 py-3 text-left font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedEvaluations.map((evalItem: any) => (
                    <tr key={evalItem._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">{evalItem.doctor.fullName}</td>
                      <td className="px-4 py-3 capitalize">{evalItem.doctor.specialty}</td>
                      <td className="px-4 py-3">{evalItem.date.slice(0, 10).split("-").reverse().join("/")}</td>
                      <td className="px-4 py-3">{evalItem.time}</td>
                      <td className="px-4 py-3 capitalize">  {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(evalItem.valuePaid ?? 0)}</td>
                      <td className="px-4 py-3 capitalize">{evalItem.paymentType}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEvaluationToEdit(evalItem);
                                    setEvaluationData({
                                      doctorId: evalItem.doctorId._id,
                                      valuePaid: evalItem.valuePaid,
                                      paymentType: evalItem.paymentType,
                                      date: toDateString(evalItem.date),
                                      time: evalItem.time,
                                    });
                                    setShowModal(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onDelete(evalItem._id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Excluir</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Exibindo <span className="font-semibold text-gray-700">{(currentPage - 1) * PAGE_SIZE + 1}</span>–<span className="font-semibold text-gray-700">{Math.min(currentPage * PAGE_SIZE, totalEvaluations)}</span> de <span className="font-semibold text-gray-700">{totalEvaluations}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))}>
                    Anterior
                  </Button>
                  <span className="min-w-24 text-center text-xs font-semibold text-gray-600">Página {currentPage} de {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}>
                    Próxima
                  </Button>
                </div>
              </div>
            </div>

          )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Nova Avaliação Agendada</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="evaluationDoctor">Profissional</Label>
                <Select
                  id="evaluationDoctor"
                  name="doctorId"
                  value={evaluationData.doctorId}
                  onChange={handleChange}
                >
                  <option value="">Selecione</option>
                  {doctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>{doc.fullName}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label >Valor (R$)</Label>
                <InputCurrency
                  name="valuePaid"
                  value={evaluationData.valuePaid}
                  onChange={({ target }) => {
                    const syntheticEvent = {
                      target: {
                        name: target.name,
                        value: target.value.toString(),
                      },
                    } as React.ChangeEvent<HTMLInputElement>;
                    handleChange(syntheticEvent);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="paymentType">Tipo de Pagamento</Label>
                <Select
                  name="paymentType"
                  value={evaluationData.paymentType}
                  onChange={handleChange}

                >
                  <option value="">Escolha um método</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="cartão">Cartão</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="patientName">Nome do Paciente</Label>
                <Input
                  id="patientName"
                  name="patientName"
                  lang="pt-BR"
                  value={patientInfo?.fullName || ''}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  type="date"
                  id="date"
                  name="date"
                  value={evaluationData.date}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="time">Hora</Label>
                <Input
                  type="time"
                  id="time"
                  name="time"
                  value={evaluationData.time}
                  onChange={handleChange}
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Salvar Avaliação
              </Button>
            </form>
          </div>
        </div>
      )
      }
    </>
  );
}
