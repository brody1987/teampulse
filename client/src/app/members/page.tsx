"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, UserCircle } from "lucide-react";
import { MemberDialog } from "@/components/member-dialog";

interface Member {
  id: number;
  name: string;
  role: string;
  teamId: number;
  position: string;
  email: string;
  phone: string;
  isActive: boolean;
  teamName: string;
  teamColor: string;
}

interface Team {
  id: number;
  name: string;
}

export default function MembersPage() {
  const [teamFilter, setTeamFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);

  const queryParams = new URLSearchParams();
  if (teamFilter !== "all") queryParams.set("teamId", teamFilter);
  if (search) queryParams.set("search", search);

  const { data: members, isLoading, mutate } = useSWR<Member[]>(`/api/members?${queryParams}`, fetcher);
  const { data: teams } = useSWR<Team[]>("/api/teams", fetcher);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">멤버 관리</h1>
          <p className="text-slate-500 mt-1">전체 부서원 현황</p>
        </div>
        <Button onClick={() => { setEditMember(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> 멤버 추가
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="이름으로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="팀 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 팀</SelectItem>
                {teams?.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>소속 팀</TableHead>
                  <TableHead>직책</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Link href={`/members/${member.id}`} className="font-medium text-blue-600 hover:underline">
                        {member.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-transparent" style={{ backgroundColor: member.teamColor + "20", color: member.teamColor }}>
                        {member.teamName}
                      </Badge>
                    </TableCell>
                    <TableCell>{member.position}</TableCell>
                    <TableCell className="text-sm text-slate-600">{member.role}</TableCell>
                    <TableCell className="text-sm text-slate-500">{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={member.isActive ? "default" : "secondary"}>
                        {member.isActive ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditMember(member); setDialogOpen(true); }}
                      >
                        수정
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {members?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <UserCircle className="h-10 w-10 text-slate-300" />
                        <span>{search ? "검색 결과가 없습니다." : "멤버가 없습니다."}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editMember}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
