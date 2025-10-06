import { TestBed } from '@angular/core/testing';
import { CalidadAireService } from './calidad-aire.service';

describe('CalidadAire', () => {
  let service: CalidadAireService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalidadAireService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
