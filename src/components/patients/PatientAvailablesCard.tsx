"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip"; // ajuste o caminho conforme sua estrutura
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { IDoctors, IPatient } from "../../utils/types/types";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
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
  const [showModal, setShowModal] = useState(false);
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

  return (
    <>
      <Card>
        <CardHeader icon={FileText}>
          <CardTitle className="text-sm font-medium">Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end">
            <TooltipProvider >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-blue-600 hover:bg-blue-100"
                    onClick={() => setShowModal(true)}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Adicionar Avaliação</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {Array.isArray(evaluations) && evaluations.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
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
                  {evaluations.map((evalItem) => (
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
                                      date: evalItem.date.split("T")[0],
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
            </div>

          )}

        </CardContent>
      </Card >

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
